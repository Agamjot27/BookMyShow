import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import jwt from "jsonwebtoken";

// Synthetic configuration: these checks never access PostgreSQL or Redis.
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.JWT_ISSUER = "scaffold-test";
process.env.JWT_AUDIENCE = "scaffold-client";
process.env.SMTP_USER = "scaffold@example.test";
process.env.SMTP_PASS = "synthetic-test-only";

test("scaffold routes enforce authentication and admin authorization", async () => {
  const { app } = await import("../src/app.js");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  const token = (role: string, expiresIn = 60) => jwt.sign({ role }, process.env.JWT_SECRET!, {
    algorithm: "HS256", subject: "00000000-0000-4000-8000-000000000001", issuer: "scaffold-test",
    audience: "scaffold-client", expiresIn,
  });
  const headers = (value: string) => ({ Authorization: `Bearer ${value}` });
  try {
    assert.equal((await fetch(`${base}/admin/shows?event_id=invalid`, { headers: headers(token("admin")) })).status, 400);
    assert.equal((await fetch(`${base}/bookings`)).status, 401);
    assert.equal((await fetch(`${base}/admin/venues`)).status, 401);
    assert.equal((await fetch(`${base}/admin/venues`, { headers: headers(token("user")) })).status, 403);
    assert.equal((await fetch(`${base}/admin/bookings/invalid`, { headers: headers(token("admin")) })).status, 400);
    assert.equal((await fetch(`${base}/bookings/invalid`, { headers: headers(token("user")) })).status, 400);
    assert.equal((await fetch(`${base}/admin/venues`, { headers: headers(token("admin", -1)) })).status, 401);
    assert.equal((await fetch(`${base}/admin/venues`, { headers: headers("invalid") })).status, 401);
    assert.equal((await fetch(`${base}/bookings/confirm`, { method: "POST", headers: headers(token("user")) })).status, 400);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
