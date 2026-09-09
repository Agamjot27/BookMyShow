import { createHash, randomInt } from "node:crypto";
import { redis } from "../config/redis.js";

const OTP_TTL_SECONDS = 600;        // 10 minutes
const MAX_ATTEMPTS    = 5;          // lockout after 5 wrong guesses
const REDIS_PREFIX    = "otp:";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function redisKey(email: string)         { return `${REDIS_PREFIX}${email.toLowerCase()}`; }
function hashOtp(otp: string)            { return createHash("sha256").update(otp).digest("hex"); }

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a 6-digit OTP, store its SHA-256 hash in Redis with a 10-min TTL,
 * and return the plaintext OTP (to be emailed — never logged or stored as-is).
 */
export async function createOtp(email: string): Promise<string> {
  const otp  = String(randomInt(100_000, 999_999)); // 6 digits, cryptographically random
  const hash = hashOtp(otp);

  // Store: { hash, attempts }
  await redis.set(
    redisKey(email),
    JSON.stringify({ hash, attempts: 0 }),
    { EX: OTP_TTL_SECONDS },
  );

  return otp;
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "invalid" | "locked" };

/**
 * Verify a plaintext OTP submitted by the user.
 * Increments the attempt counter; deletes the key on success.
 */
export async function verifyOtp(email: string, otp: string): Promise<OtpVerifyResult> {
  const key = redisKey(email);
  const raw = await redis.get(key);

  if (!raw) return { ok: false, reason: "expired" };

  const data = JSON.parse(raw) as { hash: string; attempts: number };

  if (data.attempts >= MAX_ATTEMPTS) {
    await redis.del(key); // clear after lockout
    return { ok: false, reason: "locked" };
  }

  if (hashOtp(otp) !== data.hash) {
    // Persist incremented attempt count with the remaining TTL
    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify({ ...data, attempts: data.attempts + 1 }), { EX: ttl > 0 ? ttl : 1 });
    return { ok: false, reason: "invalid" };
  }

  await redis.del(key); // consumed — can't be reused
  return { ok: true };
}
