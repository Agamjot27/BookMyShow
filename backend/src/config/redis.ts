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

  evalShared(script: string, keys: string[], args: string[]): unknown {
    if (script.includes("MGET")) {
      return keys.map(k => {
        if (!this.cleanupExpired(k)) return null;
        return this.store.get(k)?.value ?? null;
      });
    }
    if (script.includes("GET") && !script.includes("cjson")) {
      if (!this.cleanupExpired(keys[0])) return null;
      return this.store.get(keys[0])?.value ?? null;
    }
    if (keys[0]?.startsWith("hold:") && args.length >= 4 && (args[3].startsWith("[") || args[3].startsWith("{"))) {
      const holdKey = keys[0];
      const seatKeys = keys.slice(1);
      const userId = args[0];
      const showId = args[1];
      const token = args[2];
      const seats = JSON.parse(args[3]) as string[];

      const old = this.store.get(holdKey)?.value;
      if (old) {
        const h = JSON.parse(old);
        if (h.user_id !== userId || h.show_id !== showId || h.seat_ids.length !== seats.length) return ["conflict"];
        for (let i = 0; i < seats.length; i++) {
          if (h.seat_ids[i] !== seats[i]) return ["conflict"];
        }
        for (let i = 0; i < seatKeys.length; i++) {
          const raw = this.store.get(seatKeys[i])?.value;
          if (!raw) return ["expired"];
          const s = JSON.parse(raw);
          if (s.hold_token !== token || s.user_id !== userId) return ["expired"];
        }
        return ["existing", old];
      }

      for (let i = 0; i < seatKeys.length; i++) {
        if (this.cleanupExpired(seatKeys[i])) {
          return ["unavailable"];
        }
      }

      const deadline = Date.now() + 300000;
      const hObj = { user_id: userId, show_id: showId, hold_token: token, seat_ids: seats, expires_at: deadline };
      const sObj = { user_id: userId, hold_token: token, expires_at: deadline };
      const hStr = JSON.stringify(hObj);
      const sStr = JSON.stringify(sObj);

      for (let i = 0; i < seatKeys.length; i++) {
        this.store.set(seatKeys[i], { value: sStr, expiresAt: deadline });
      }
      this.store.set(holdKey, { value: hStr, expiresAt: deadline });
      return ["created", hStr];
    }
    if (keys[0]?.startsWith("hold:") && args.length >= 4) {
      const raw = this.store.get(keys[0])?.value;
      if (!raw || raw !== args[0]) return "expired";
      const h = JSON.parse(raw);
      if (h.user_id !== args[1] || h.show_id !== args[2]) return "forbidden";
      let valid = true;
      const seatKeys = keys.slice(1);
      for (let i = 0; i < seatKeys.length; i++) {
        const sRaw = this.store.get(seatKeys[i])?.value;
        if (sRaw) {
          const s = JSON.parse(sRaw);
          if (s.user_id === h.user_id && s.hold_token === h.hold_token) {
            if (args[3] === "release") this.store.delete(seatKeys[i]);
          } else valid = false;
        } else valid = false;
      }
      if (args[3] === "release") {
        this.store.delete(keys[0]);
        return "released";
      }
      if (!valid || !this.cleanupExpired(keys[0])) return "expired";
      return "valid";
    }
    return null;
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
    if (this.useMemory || !this.isConnected) return;
    await this.realClient.quit();
  }

  // Inventory uses shared Redis in production, falling back to memory store in local dev.
  async evalShared(script: string, keys: string[], args: string[]): Promise<unknown> {
    if (this.useMemory) return this.memoryStore.evalShared(script, keys, args);
    if (!this.realClient.isReady) throw this.unavailable();
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
