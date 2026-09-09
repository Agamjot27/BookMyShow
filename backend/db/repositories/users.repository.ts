import { createHash, randomBytes, randomUUID } from "node:crypto";
import { pool } from "../client.js";
import type { PoolClient } from "pg";
import { withTransaction } from "../transactions.js";

export type UserRole   = "user" | "admin";
export type PublicUser = { user_id: string; name: string; email: string; role: UserRole };
export type UserRecord = PublicUser & { password_hash: string | null };

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const result = await pool.query<UserRecord>(
    "SELECT user_id, name, email, password_hash, role FROM users WHERE lower(email) = $1",
    [email.toLowerCase()],
  );
  return result.rows[0];
}

export async function findPublicUserById(id: string): Promise<PublicUser | undefined> {
  const result = await pool.query<PublicUser>(
    "SELECT user_id, name, email, role FROM users WHERE user_id = $1",
    [id],
  );
  return result.rows[0];
}

/**
 * Insert a new user (OTP flow — no password).
 * Public registration always gets role = 'user'.
 */
export async function createUser(name: string, email: string): Promise<PublicUser> {
  const result = await pool.query<PublicUser>(
    `INSERT INTO users (user_id, name, email, password_hash, role)
     VALUES ($1, $2, $3, NULL, 'user')
     RETURNING user_id, name, email, role`,
    [randomUUID(), name, email.toLowerCase()],
  );
  return result.rows[0];
}

/**
 * Upsert on verified OTP: create user if new, return existing user if already registered.
 * name is required only for new users; if omitted for an existing user it is ignored.
 */
export async function upsertUserByEmail(
  email: string, name?: string,
): Promise<{ user: PublicUser; isNew: boolean }> {
  const displayName = (name ?? "").trim() || email.split("@")[0];
  const inserted = await pool.query<PublicUser>(
    `INSERT INTO users (user_id, name, email, password_hash, role)
     VALUES ($1, $2, $3, NULL, 'user')
     ON CONFLICT (lower(email)) DO NOTHING
     RETURNING user_id, name, email, role`,
    [randomUUID(), displayName, email.toLowerCase()],
  );
  if (inserted.rows[0]) return { user: inserted.rows[0], isNew: true };
  // Separate statement sees the committed winner of a concurrent insert.
  const existing = await findUserByEmail(email);
  if (!existing) throw new Error("User missing after email conflict");
  const { password_hash: _, ...user } = existing;
  return { user, isNew: false };
}

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

const REFRESH_TTL_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** All session writers lock the user first, including when no token exists yet. */
async function lockUser(client: PoolClient, userId: string): Promise<PublicUser | undefined> {
  const result = await client.query<PublicUser>(
    "SELECT user_id, name, email, role FROM users WHERE user_id = $1 FOR UPDATE",
    [userId],
  );
  return result.rows[0];
}

// Caller holds the user lock and owns the transaction. An insert failure rolls
// back the deletion, preserving the previous session.
async function replaceRefreshToken(client: PoolClient, userId: string): Promise<string> {
  const token = randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000);
  await client.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
  await client.query(
    `INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, hashToken(token), expiresAt],
  );
  return token;
}

/** Issue a refresh token while preserving the single-active-session policy. */
export async function issueRefreshToken(userId: string): Promise<string> {
  return withTransaction(async client => {
    if (!await lockUser(client, userId)) throw new Error("User no longer exists");
    return replaceRefreshToken(client, userId);
  });
}

/** Consume the presented token exactly once and replace it in the same transaction. */
export async function rotateRefreshToken(
  token: string,
): Promise<{ user: PublicUser; refreshToken: string } | undefined> {
  return withTransaction(async client => {
    const tokenHash = hashToken(token);
    const candidate = await client.query<{ user_id: string }>(
      "SELECT user_id FROM refresh_tokens WHERE token_hash = $1",
      [tokenHash],
    );
    if (!candidate.rows[0]) return undefined;
    const user = await lockUser(client, candidate.rows[0].user_id);
    if (!user) return undefined;
    // Recheck after acquiring the lock: another refresh/login/logout may have won.
    const consumed = await client.query(
      `DELETE FROM refresh_tokens
       WHERE token_hash = $1 AND user_id = $2 AND expires_at > clock_timestamp()
       RETURNING token_id`,
      [tokenHash, user.user_id],
    );
    if (!consumed.rowCount) return undefined;
    const refreshToken = await replaceRefreshToken(client, user.user_id);
    return { user, refreshToken };
  });
}

/** Revoke all refresh tokens for a user (logout), serialized with rotation/login. */
export async function revokeRefreshTokens(userId: string): Promise<void> {
  await withTransaction(async client => {
    if (!await lockUser(client, userId)) return;
    await client.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
  });
}
