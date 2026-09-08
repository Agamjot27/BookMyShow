import { config } from "dotenv";
import { fileURLToPath } from "node:url";
// Works from source and compiled dist/src/config.
const root = import.meta.url.includes("/dist/") ? "../../../../.env" : "../../../.env";
config({ path: fileURLToPath(new URL(root, import.meta.url)), quiet: true });
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
function positiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid ${name}`);
  return value;
}
export const env = {
  port: positiveInt("BACKEND_PORT", 4000),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtIssuer: required("JWT_ISSUER"),
  jwtAudience: required("JWT_AUDIENCE"),
  pgPoolMax: positiveInt("PG_POOL_MAX", 10),
  pgLockTimeout: positiveInt("PG_LOCK_TIMEOUT_MS", 1000),
  pgStatementTimeout: positiveInt("PG_STATEMENT_TIMEOUT_MS", 2000),
  redisConnectTimeout: positiveInt("REDIS_CONNECT_TIMEOUT_MS", 1000),
};
if (env.jwtSecret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
