import { randomUUID } from "node:crypto";
import { pool } from "../client.js";

export type UserRole = "user" | "admin";
export type PublicUser = { user_id: string; name: string; email: string; role: UserRole };
export type UserRecord = PublicUser & { password_hash: string };

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const result = await pool.query<UserRecord>(
    "SELECT user_id, name, email, password_hash, role FROM users WHERE lower(email) = $1",
    [email],
  );
  return result.rows[0];
}
export async function findPublicUserById(id: string): Promise<PublicUser | undefined> {
  const result = await pool.query<PublicUser>(
    "SELECT user_id, name, email, role FROM users WHERE user_id = $1", [id],
  );
  return result.rows[0];
}
export async function createUser(name: string, email: string, passwordHash: string): Promise<PublicUser> {
  // Public registration never accepts a role from the caller.
  const result = await pool.query<PublicUser>(
    "INSERT INTO users (user_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, 'user') RETURNING user_id, name, email, role",
    [randomUUID(), name, email, passwordHash],
  );
  return result.rows[0];
}
