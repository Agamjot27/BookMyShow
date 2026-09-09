import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "./client.js";

// Initial migration only. No extra application tables or silent schema adoption.
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(917402)");
  const existing = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  if (existing.rowCount) {
    throw new Error("Public tables already exist. Initial migration is applied only to an empty database; inspect the schema before proceeding.");
  }
  const sql = await readFile(resolve("db/migrations/001_initial_schema.up.sql"), "utf8");
  await client.query(sql);
  console.log("Applied 001_initial_schema.up.sql (eight tables).");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Migration failed:", error instanceof Error && error.message.startsWith("Public tables") ? error.message : (error as { code?: string }).code ?? "Check configuration");
  process.exitCode = 1;
} finally {
  await client.query("SELECT pg_advisory_unlock(917402)").catch(() => {});
  client.release();
  await pool.end();
}
