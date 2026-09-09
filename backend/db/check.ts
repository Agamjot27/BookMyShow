import { pool } from "./client.js";
try {
  await pool.query("SELECT 1");
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  console.log("PostgreSQL connection successful.");
  console.log("Public tables:", tables.rows.map(row => row.tablename).join(", ") || "(none)");
} catch (error) {
  console.error("Database connection failed:", (error as { code?: string }).code ?? "Check local configuration");
  process.exitCode = 1;
} finally { await pool.end(); }
