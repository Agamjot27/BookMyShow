import { createHash, randomBytes, randomUUID } from "node:crypto";
import { pool } from "../client.js";

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
  const existing = await findUserByEmail(email);
  if (existing) {
    const { password_hash: _, ...user } = existing;
    return { user, isNew: false };
  }
  const displayName = (name ?? "").trim() || email.split("@")[0];
  const user = await createUser(displayName, email);
  return { user, isNew: true };
}

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

const REFRESH_TTL_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issue a new opaque refresh token, store its hash, and return the plaintext token.
 * Deletes any existing refresh tokens for the user first (single active session).
 */
export async function issueRefreshToken(userId: string): Promise<string> {
  const token     = randomBytes(48).toString("hex"); // 96-char hex, 384 bits of entropy
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000);

  await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
  await pool.query(
    `INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, tokenHash, expiresAt],
  );

  return token;
}

/**
 * Look up a refresh token by its plaintext value.
 * Returns the associated user_id if valid and not expired, otherwise undefined.
 */
export async function findRefreshToken(
  token: string,
): Promise<{ user_id: string } | undefined> {
  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM refresh_tokens
     WHERE token_hash = $1 AND expires_at > now()`,
    [hashToken(token)],
  );
  return result.rows[0];
}

/** Revoke all refresh tokens for a user (logout). */
export async function revokeRefreshTokens(userId: string): Promise<void> {
  await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
}
