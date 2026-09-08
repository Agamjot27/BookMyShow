import { Pool } from "pg";
import { env } from "../src/config/env.js";
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.pgPoolMax,
  connectionTimeoutMillis: 2000,
  lock_timeout: env.pgLockTimeout,
  statement_timeout: env.pgStatementTimeout,
  options: "-c timezone=UTC",
});
pool.on("error", () => console.error("Unexpected PostgreSQL pool error"));
