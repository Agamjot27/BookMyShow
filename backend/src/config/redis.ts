import { createClient } from "redis";
import { env } from "./env.js";
export const redis = createClient({
  url: env.redisUrl,
  socket: { connectTimeout: env.redisConnectTimeout, reconnectStrategy: false },
  disableOfflineQueue: true,
});
redis.on("error", () => console.error("Redis connection error"));
// Connect when the inventory service is implemented; importing does not connect.
