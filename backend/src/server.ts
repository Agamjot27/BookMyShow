import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "../db/client.js";
import { redis } from "./config/redis.js";

await redis.connect();

const server = app.listen(env.port, () => console.log(`API listening on port ${env.port}`));

function shutdown() {
  server.close(async () => {
    await redis.quit();
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
