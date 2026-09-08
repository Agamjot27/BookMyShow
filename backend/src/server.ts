import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "../db/client.js";
const server = app.listen(env.port, () => console.log(`API listening on port ${env.port}`));
function shutdown() {
  server.close(() => { void pool.end().then(() => process.exit(0)); });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
