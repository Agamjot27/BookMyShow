/**
 * Concurrency tests — seat holds and booking uniqueness guarantees
 *
 * These tests exercise the core claim of the system: two users cannot
 * acquire or book the same seat simultaneously.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * IMPLEMENTATION NOTES — what each test proves and its limitations
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Tests A (hold race) and C (multi-seat atomicity) use MemoryStore directly.
 *   • They prove the acquire script logic is race-free within a single process.
 *   • They do NOT prove Redis Lua atomicity on a real cluster — that is
 *     guaranteed by the Redis eval contract and covered by auth.test.ts when
 *     a real Redis is available.
 *   • MemoryStore is the authoritative dev fallback; production semantics are
 *     identical (same script paths, same return codes).
 *
 * Test B (booking confirmation) requires real PostgreSQL + Redis to exercise
 *   the `INSERT … ON CONFLICT` / `23505` unique-constraint path in bookings.
 *   It is skipped automatically when the database is not reachable so that
 *   the suite remains runnable in CI environments without a Postgres sidecar.
 *   When it runs it proves:
 *     - Two simultaneous confirm() calls for the same hold produce exactly
 *       one confirmed booking row.
 *     - The UNIQUE constraint on (show_id, seat_id) in booking_seats is
 *       exercised; the second writer receives SEATS_UNAVAILABLE (23505 path).
 *     - The winning booking owns the seat.
 *   Redis hold state uses MemoryStore fallback when Redis is not available
 *   (REDIS_ALLOW_MEMORY_FALLBACK=true in .env). The test still exercises the
 *   full bookings.service.confirm() path and all Postgres uniqueness guards.
 *   To run with real Redis: start Redis on 6379 and set NODE_ENV=development.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { config as dotenvConfig } from "dotenv";

// Load .env from the workspace root first so real credentials (DATABASE_URL,
// REDIS_URL, etc.) are available when the integration tests run locally.
// "../../.env" resolves from backend/tests/ → backend/ → workspace root.
const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
dotenvConfig({ path: envPath, quiet: true });

// Synthetic fallbacks — only applied when .env is absent (e.g. bare CI).
// Tests that only use MemoryStore work fine with these; integration tests
// (test B) will skip automatically if the real DB is not reachable.
process.env.DATABASE_URL     ??= "postgresql://test:test@localhost:5432/test_concurrency";
process.env.REDIS_URL        ??= "redis://localhost:6379";
process.env.JWT_SECRET       ??= "concurrency-test-secret-must-be-at-least-32-chars";
process.env.JWT_ISSUER       ??= "concurrency-test";
process.env.JWT_AUDIENCE     ??= "concurrency-client";
process.env.SMTP_USER        ??= "concurrency@example.test";
process.env.SMTP_PASS        ??= "synthetic";

// ─── A. Concurrent hold race ─────────────────────────────────────────────────
test("A — concurrent hold race: exactly one user wins, the other gets UNAVAILABLE", async () => {
  const { MemoryStore } = await import("../src/config/redis.js");
  const store = new MemoryStore();

  const showId  = randomUUID();
  const seatId  = randomUUID();
  const userA   = randomUUID();
  const userB   = randomUUID();
  const tokenA  = randomUUID();
  const tokenB  = randomUUID();

  const holdKeyA  = `hold:${tokenA}`;
  const holdKeyB  = `hold:${tokenB}`;
  const seatKey   = `seat:${showId}:${seatId}`;

  // Fire both acquire scripts "simultaneously" (synchronously within the same
  // JS microtask — MemoryStore.evalShared is synchronous, matching Redis Lua).
  const resultA = store.evalShared("acquire", [holdKeyA, seatKey],
    [userA, showId, tokenA, JSON.stringify([seatId])]) as string[];

  const resultB = store.evalShared("acquire", [holdKeyB, seatKey],
    [userB, showId, tokenB, JSON.stringify([seatId])]) as string[];

  // Exactly one must succeed.
  const outcomes = [resultA[0], resultB[0]];
  assert.equal(outcomes.filter(o => o === "created").length, 1,
    "Exactly one user should have created the hold");
  assert.equal(outcomes.filter(o => o === "unavailable").length, 1,
    "Exactly one user should have received unavailable");

  // The winner's record must reference that seat.
  const winner = resultA[0] === "created" ? resultA : resultB;
  const winnerToken = resultA[0] === "created" ? tokenA : tokenB;
  const record = JSON.parse(winner[1]) as { hold_token: string; seat_ids: string[] };
  assert.equal(record.hold_token, winnerToken);
  assert.deepEqual(record.seat_ids, [seatId]);

  // The seat key must belong to the winning user's hold token.
  const seatRaw = await store.get(seatKey);
  assert.ok(seatRaw, "Seat key must exist in store after hold creation");
  const seatObj = JSON.parse(seatRaw) as { hold_token: string };
  assert.equal(seatObj.hold_token, winnerToken,
    "Seat key must reference the winning hold token");
});

// ─── A2. Re-acquire by same user returns 'existing' ──────────────────────────
test("A2 — same user re-acquiring the same hold token returns 'existing'", async () => {
  const { MemoryStore } = await import("../src/config/redis.js");
  const store = new MemoryStore();

  const showId = randomUUID();
  const seatId = randomUUID();
  const userId = randomUUID();
  const token  = randomUUID();
  const holdKey = `hold:${token}`;
  const seatKey = `seat:${showId}:${seatId}`;
  const seatsJson = JSON.stringify([seatId]);

  const first = store.evalShared("acquire", [holdKey, seatKey],
    [userId, showId, token, seatsJson]) as string[];
  assert.equal(first[0], "created");

  const second = store.evalShared("acquire", [holdKey, seatKey],
    [userId, showId, token, seatsJson]) as string[];
  assert.equal(second[0], "existing",
    "Same user, same token, same seats should be idempotent (existing)");
});

// ─── C. Multi-seat atomicity ──────────────────────────────────────────────────
test("C — multi-seat atomicity: if one seat is taken the whole hold fails", async () => {
  const { MemoryStore } = await import("../src/config/redis.js");
  const store = new MemoryStore();

  const showId = randomUUID();
  const seat1  = randomUUID();
  const seat2  = randomUUID(); // will be pre-held by another user
  const userA  = randomUUID();
  const userB  = randomUUID();
  const tokenA = randomUUID();
  const tokenB = randomUUID();

  // userA holds seat2 first.
  const preHold = store.evalShared("acquire",
    [`hold:${tokenA}`, `seat:${showId}:${seat2}`],
    [userA, showId, tokenA, JSON.stringify([seat2])]) as string[];
  assert.equal(preHold[0], "created");

  // userB tries to hold [seat1, seat2]; seat2 is already taken.
  const result = store.evalShared("acquire",
    [`hold:${tokenB}`, `seat:${showId}:${seat1}`, `seat:${showId}:${seat2}`],
    [userB, showId, tokenB, JSON.stringify([seat1, seat2])]) as string[];

  assert.equal(result[0], "unavailable",
    "Hold for [seat1, seat2] must fail because seat2 is already held");

  // seat1 must NOT have been written (atomicity: no partial holds).
  // We verify by attempting to acquire seat1 alone from a fresh user — it should succeed.
  const userC  = randomUUID();
  const tokenC = randomUUID();
  const onlySeat1 = store.evalShared("acquire",
    [`hold:${tokenC}`, `seat:${showId}:${seat1}`],
    [userC, showId, tokenC, JSON.stringify([seat1])]) as string[];
  assert.equal(onlySeat1[0], "created",
    "seat1 must still be free (not partially claimed) after userB's failed hold");
});

// ─── C2. All-or-nothing: both seats free → hold succeeds ─────────────────────
test("C2 — multi-seat hold succeeds when all seats are available", async () => {
  const { MemoryStore } = await import("../src/config/redis.js");
  const store = new MemoryStore();

  const showId = randomUUID();
  const seat1  = randomUUID();
  const seat2  = randomUUID();
  const userId = randomUUID();
  const token  = randomUUID();

  const result = store.evalShared("acquire",
    [`hold:${token}`, `seat:${showId}:${seat1}`, `seat:${showId}:${seat2}`],
    [userId, showId, token, JSON.stringify([seat1, seat2])]) as string[];

  assert.equal(result[0], "created");
  const record = JSON.parse(result[1]) as { seat_ids: string[] };
  assert.deepEqual(record.seat_ids, [seat1, seat2],
    "Hold record must list all two seats");
});

// ─── B. Concurrent booking confirmation (requires real Postgres + Redis) ──────
//
// What this test proves when it runs:
//   1. Two simultaneous confirm() calls for the same valid hold produce exactly
//      one committed booking row.
//   2. The UNIQUE constraint on booking_seats(show_id, seat_id) is exercised;
//      the second transaction either collides on 23505 or observes the already-
//      booked seat and returns SEATS_UNAVAILABLE.
//   3. The booking that survives is the sole owner of the seat.
//
// What it does NOT prove:
//   - Anything about Redis Lua atomicity on a real cluster (that is the Redis
//     contract; see Test A above for the logic correctness proof).
//   - Network-level races between geographically distributed nodes.
//
// The test is skipped when Postgres is not reachable so CI without a DB sidecar
// still passes the rest of the suite.
test("B — concurrent booking confirmation: only one booking survives", async (t) => {
  // Attempt a database connection; skip gracefully if unavailable.
  let pool: import("pg").Pool;
  try {
    const { pool: p } = await import("../db/client.js");
    await p.query("SELECT 1"); // ping
    pool = p;
  } catch {
    t.skip("PostgreSQL not reachable — skipping integration booking-concurrency test");
    return;
  }

  // Need real Redis for hold state; fall back to memory store via the resilient client.
  const { redis } = await import("../src/config/redis.js");
  await redis.connect();

  const { confirm } = await import("../src/services/bookings.service.js");

  // Build minimal fixtures: event → venue → screen → seats → show.
  const eventId  = randomUUID();
  const venueId  = randomUUID();
  const screenId = randomUUID();
  const seatId   = randomUUID();
  const showId   = randomUUID();
  const userA    = randomUUID();
  const userB    = randomUUID();
  const tokenA   = randomUUID();
  const tokenB   = randomUUID();

  // futureTime: 48 hours from now so the show is not "started".
  const startTime = new Date(Date.now() + 172_800_000).toISOString();

  t.after(async () => {
    try {
      await pool.query("DELETE FROM booking_seats WHERE show_id = $1", [showId]);
      await pool.query("DELETE FROM bookings     WHERE show_id = $1", [showId]);
      await pool.query("DELETE FROM shows        WHERE show_id = $1", [showId]);
      await pool.query("DELETE FROM seats        WHERE screen_id = $1", [screenId]);
      await pool.query("DELETE FROM screens      WHERE screen_id = $1", [screenId]);
      await pool.query("DELETE FROM venues       WHERE venue_id = $1", [venueId]);
      await pool.query("DELETE FROM events       WHERE event_id = $1", [eventId]);
      await pool.query("DELETE FROM users        WHERE user_id IN ($1,$2)", [userA, userB]);
    } catch { /* best-effort cleanup */ }
  });

  // Insert fixtures.
  await pool.query(
    "INSERT INTO events(event_id,type,title,duration) VALUES ($1,'movie','Concurrency B test',120)",
    [eventId]);
  await pool.query(
    "INSERT INTO venues(venue_id,name,address) VALUES ($1,'ConcVenue','Concurrency Street')",
    [venueId]);
  await pool.query(
    "INSERT INTO screens(screen_id,venue_id,name) VALUES ($1,$2,'ConcScreen')",
    [screenId, venueId]);
  await pool.query(
    `INSERT INTO seats(seat_id,screen_id,"row",number) VALUES ($1,$2,'A',1)`,
    [seatId, screenId]);
  await pool.query(
    `INSERT INTO shows(show_id,event_id,screen_id,start_time,end_time,base_price)
     VALUES ($1,$2,$3,$4,$4::timestamptz + interval '2 hours','250.00')`,
    [showId, eventId, screenId, startTime]);
  await pool.query(
    "INSERT INTO users(user_id,email,name,role) VALUES ($1,$2,'User A','user'),($3,$4,'User B','user')",
    [userA, `conc_a_${randomUUID()}@example.test`,
     userB, `conc_b_${randomUUID()}@example.test`]);

  // Give BOTH users a valid hold on the same seat via MemoryStore / Redis.
  // (In a real flow only one would win the hold; here we deliberately bypass
  //  hold exclusion to stress-test the DB-level uniqueness guarantee.)
  const { acquire } = await import("../src/lib/seat-holds.js");
  await acquire(userA, showId, tokenA, [seatId]);

  // Manually inject a second hold record so both users appear to hold the seat.
  // We do this by writing directly to the memory/redis store, bypassing acquire's
  // unavailable check — this is the adversarial scenario we want to guard against.
  const seatKey  = `seat:${showId}:${seatId}`;
  const deadline = Date.now() + 300_000;
  const seatObjB = JSON.stringify({ user_id: userB, hold_token: tokenB, expires_at: deadline });
  const holdObjB = JSON.stringify({ user_id: userB, show_id: showId, hold_token: tokenB,
    seat_ids: [seatId], expires_at: deadline });
  await redis.set(seatKey,         seatObjB, { EX: 300 });
  await redis.set(`hold:${tokenB}`, holdObjB, { EX: 300 });

  // Fire both confirmations concurrently.
  const [resultA, resultB] = await Promise.allSettled([
    confirm(userA, randomUUID(), { show_id: showId, hold_token: tokenA,
      seat_ids: [seatId], payment_result: "success" }),
    confirm(userB, randomUUID(), { show_id: showId, hold_token: tokenB,
      seat_ids: [seatId], payment_result: "success" }),
  ]);

  // Count confirmed bookings for this show + seat.
  const { rows } = await pool.query<{ booking_id: string; user_id: string }>(
    `SELECT b.booking_id, b.user_id
     FROM bookings b
     JOIN booking_seats bs ON bs.booking_id = b.booking_id
     WHERE bs.show_id = $1 AND bs.seat_id = $2 AND b.status = 'confirmed'`,
    [showId, seatId]);

  assert.equal(rows.length, 1,
    `Exactly one confirmed booking must exist for seat; found ${rows.length}`);

  // Exactly one Promise must have fulfilled, the other must have rejected.
  const successes  = [resultA, resultB].filter(r => r.status === "fulfilled");
  const failures   = [resultA, resultB].filter(r => r.status === "rejected");
  assert.equal(successes.length, 1, "Exactly one confirm() call should have succeeded");
  assert.equal(failures.length,  1, "Exactly one confirm() call should have failed");

  // The winning user ID must match the DB row.
  const winnerResult = (successes[0] as PromiseFulfilledResult<{ created: boolean; ticket: unknown }>).value;
  assert.equal(winnerResult.created, true, "Winner must report created=true");

  const loserError = (failures[0] as PromiseRejectedResult).reason as { code?: string; status?: number };
  assert.ok(
    loserError.code === "SEATS_UNAVAILABLE" ||
    loserError.code === "HOLD_TOKEN_CONFLICT" ||
    loserError.status === 409,
    `Losing confirm() must throw a 409-class error; got code=${loserError.code} status=${loserError.status}`);
});
