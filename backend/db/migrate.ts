import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./client.js";

const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(917402)");

  // Ensure migration tracking table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Get applied migrations
  const appliedRes = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
  const appliedSet = new Set(appliedRes.rows.map(r => r.name));

  // Find all *.up.sql files in db/migrations
  const migrationsDir = fileURLToPath(new URL("./migrations/", import.meta.url));
  const files = (await readdir(migrationsDir)).filter(f => f.endsWith(".up.sql")).sort();

  // Never infer migration history from one table, even on legacy databases.
  if (!appliedSet.has("001_initial_schema.up.sql")) {
    const existing = await client.query<{ relname: string }>(
      `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
       AND c.relname <> 'schema_migrations'`,
    );
    if (existing.rowCount) {
      throw new Error("Untracked existing schema: refusing to assume migration 001 is applied. Reconcile the complete schema and migration history before retrying; no application tables were changed.");
    }
  }

  let appliedCount = 0;
  for (const file of files) {
    if (appliedSet.has(file)) continue;

    console.log(`Applying migration: ${file}...`);
    const sql = await readFile(join(migrationsDir, file), "utf8");

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`✓ Applied ${file}`);
      appliedCount++;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  if (appliedCount === 0) {
    console.log("Database schema is already up to date.");
  }
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.query("SELECT pg_advisory_unlock(917402)").catch(() => {});
  client.release();
  await pool.end();
}
