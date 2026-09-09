import { createClient, type RedisClientType } from "redis";
import { env } from "./env.js";
import { ApiError } from "../lib/api-error.js";

type OtpStatus = "ok" | "expired" | "invalid" | "locked";
type OtpRecord = { generation?: string; hash: string; attempts: number };

// Compare issuance, then check/update/consume in one indivisible Redis operation.
const VERIFY_OTP_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'expired' end
local data = cjson.decode(raw)
if (data.generation or '') ~= ARGV[1] then return 'expired' end
if data.attempts >= tonumber(ARGV[3]) then
  redis.call('DEL', KEYS[1])
  return 'locked'
end
if data.hash ~= ARGV[2] then
  data.attempts = data.attempts + 1
  redis.call('SET', KEYS[1], cjson.encode(data), 'KEEPTTL')
  return 'invalid'
end
redis.call('DEL', KEYS[1])
return 'ok'
`;

// In-memory fallback store for development when Redis is not running locally.
class MemoryStore {
  private store = new Map<string, { value: string; expiresAt: number }>();

  private cleanupExpired(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  // No await between reading and mutating: atomic within this development process.
  verifyOtpAtomic(key: string, hash: string, maxAttempts: number): OtpStatus {
    if (!this.cleanupExpired(key)) return "expired";
    const entry = this.store.get(key)!;
    const data = JSON.parse(entry.value) as OtpRecord;
    if (data.attempts >= maxAttempts) {
      this.store.delete(key);
      return "locked";
    }
    if (data.hash !== hash) {
      entry.value = JSON.stringify({ ...data, attempts: data.attempts + 1 });
      return "invalid";
    }
    this.store.delete(key);
    return "ok";
  }

  async get(key: string): Promise<string | null> {
    if (!this.cleanupExpired(key)) return null;
    return this.store.get(key)?.value ?? null;
  }

  async set(key: string, value: string, options?: { EX?: number }): Promise<string | null> {
    const ttlMs = (options?.EX ?? 86400) * 1000;
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async ttl(key: string): Promise<number> {
    if (!this.cleanupExpired(key)) return -2;
    const entry = this.store.get(key);
    if (!entry) return -2;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }
}

class ResilientRedisClient {
  private realClient: RedisClientType;
  private memoryStore = new MemoryStore();
  public isConnected = false;
  private useMemory = false;

  constructor() {
    this.realClient = createClient({
      url: env.redisUrl,
      socket: { connectTimeout: env.redisConnectTimeout, reconnectStrategy: false },
      disableOfflineQueue: true,
    }) as RedisClientType;

    this.realClient.on("error", () => {
      console.error("[Redis] Connection error");
    });
    this.realClient.on("end", () => { this.isConnected = false; });
  }

  private unavailable(): ApiError {
    return new ApiError(503, "SERVICE_UNAVAILABLE", "Service temporarily unavailable");
  }

  // Choose memory only on initial connection failure, never after a command fails.
  async connect(): Promise<void> {
    if (this.useMemory || this.realClient.isReady) return;
    try {
      await this.realClient.connect();
      this.isConnected = true;
      console.log("[Redis] Connected");
    } catch {
      this.isConnected = false;
      if (!env.redisMemoryFallback) throw this.unavailable();
      this.useMemory = true;
      console.warn("[Redis] Explicit local-development memory fallback enabled; state is process-local.");
    }
  }

  private async run<T>(remote: () => Promise<T>, local: () => T | Promise<T>): Promise<T> {
    if (this.useMemory) return local();
    if (!this.realClient.isReady) throw this.unavailable();
    try {
      return await remote();
    } catch {
      throw this.unavailable();
    }
  }

  async quit(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.realClient.quit();
      } catch {
        // ignore shutdown error
      }
      this.isConnected = false;
    }
  }

  // Inventory always requires shared Redis, even with local OTP fallback enabled.
  async evalShared(script: string, keys: string[], args: string[]): Promise<unknown> {
    if (this.useMemory || !this.realClient.isReady) throw this.unavailable();
    try { return await this.realClient.eval(script, { keys, arguments: args }); }
    catch { throw this.unavailable(); }
  }

  async setOtp(key: string, value: string, options: { EX: number }): Promise<string | null> {
    return this.set(key, value, options);
  }

  async verifyOtpAtomic(key: string, hash: string, maxAttempts: number): Promise<OtpStatus> {
    return this.run(async () => {
      // Capture only issuance identity; attempts are read afresh inside Lua.
      const raw = await this.realClient.get(key);
      if (!raw) return "expired";
      const { generation } = JSON.parse(raw) as OtpRecord;
      const result = await this.realClient.eval(VERIFY_OTP_SCRIPT, {
        keys: [key],
        arguments: [generation ?? "", hash, String(maxAttempts)],
      });
      if (result === "ok" || result === "expired" || result === "invalid" || result === "locked") {
        return result;
      }
      throw new Error("Unexpected OTP verification result");
    }, () => this.memoryStore.verifyOtpAtomic(key, hash, maxAttempts));
  }

  async get(key: string): Promise<string | null> {
    return this.run(() => this.realClient.get(key), () => this.memoryStore.get(key));
  }

  async set(key: string, value: string, options?: { EX?: number }): Promise<string | null> {
    return this.run(() => this.realClient.set(key, value, options), () => this.memoryStore.set(key, value, options));
  }

  async del(key: string): Promise<number> {
    return this.run(() => this.realClient.del(key), () => this.memoryStore.del(key));
  }

  async ttl(key: string): Promise<number> {
    return this.run(() => this.realClient.ttl(key), () => this.memoryStore.ttl(key));
  }
}

export const redis = new ResilientRedisClient();
