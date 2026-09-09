import { randomUUID } from "node:crypto";
import { pool } from "./client.js";
import { withTransaction } from "./transactions.js";
import { hashPassword, verifyPassword } from "../src/lib/password.js";
import { parseRegistration } from "../src/middleware/auth-validation.js";

try {
  if (process.env.NODE_ENV === "production") throw new Error("Local seed is disabled in production");
  const accounts = [
    { name: "Local Admin", email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.test", password: process.env.SEED_ADMIN_PASSWORD, role: "admin" },
    { name: "Local User", email: process.env.SEED_USER_EMAIL ?? "user@example.test", password: process.env.SEED_USER_PASSWORD, role: "user" },
  ];
  // Validate both accounts before any inserts; passwords have no public defaults.
  const prepared = await Promise.all(accounts.map(async account => {
    const input = parseRegistration({ name: account.name, email: account.email, password: account.password });
    return { ...input, role: account.role, hash: await hashPassword(input.password) };
  }));
  if (prepared[0].email === prepared[1].email) throw new Error("Seed emails must be different");
  await withTransaction(async client => {
    for (const account of prepared) {
      const result = await client.query(
        "INSERT INTO users (user_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (lower(email)) DO NOTHING RETURNING user_id",
        [randomUUID(), account.name, account.email, account.hash, account.role],
      );
      if (!result.rowCount) {
        const existing = await client.query("SELECT role, password_hash FROM users WHERE lower(email) = $1", [account.email]);
        if (existing.rows[0]?.role !== account.role || !await verifyPassword(account.password, existing.rows[0].password_hash)) {
          throw new Error("Existing seed account differs from local seed configuration; no credentials or roles were overwritten");
        }
      }
    }
  });
  console.log("Local admin and user are ready. Credentials are in your local SEED_* environment variables.");
} catch (error) {
  console.error("Seed failed:", error instanceof Error && !("code" in error) ? error.message : "Check seed configuration and database");
  process.exitCode = 1;
} finally { await pool.end(); }
