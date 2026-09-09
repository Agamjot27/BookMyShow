import assert from "node:assert/strict";
import test from "node:test";
import { app } from "../src/app.js";
import { once } from "node:events";
import { redis } from "../src/config/redis.js";
import { transporter } from "../src/lib/mailer.js";
import { pool } from "../db/client.js";
import { randomUUID } from "node:crypto";

test("OTP auth end-to-end flow", async (t) => {
  // Integration test uses configured PostgreSQL/Redis, but never contacts SMTP.
  let deliveredOtp = "";
  t.mock.method(transporter, "sendMail", async (message: { subject?: string }) => {
    deliveredOtp = message.subject?.match(/^\d{6}/)?.[0] ?? "";
    return { accepted: [testEmail], rejected: [] };
  });
  const testEmail = `test_${randomUUID()}@example.test`;
  t.after(async () => {
    try {
      await pool.query("DELETE FROM users WHERE email = $1", [testEmail]);
      if (redis.isConnected) await redis.del(`otp:${testEmail}`);
    } finally {
      await redis.quit();
      await pool.end();
    }
  });
  await redis.connect();
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;


  try {
    // 1. Request OTP
    const reqRes = await fetch(`${base}/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    });
    assert.equal(reqRes.status, 200);
    const reqJson = await reqRes.json() as { message: string };
    assert.equal(reqJson.message, "OTP sent. Check your inbox.");

    // Retrieve the raw stored OTP from redis / in-memory store
    const rawData = await redis.get(`otp:${testEmail}`);
    assert.ok(rawData, "OTP record must exist in store");

    // 2. Try wrong OTP
    const wrongRes = await fetch(`${base}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, otp: "000000" }),
    });
    assert.equal(wrongRes.status, 401);

    // 3. Request a fresh OTP to test valid verification
    const resendRes = await fetch(`${base}/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    });

    assert.equal(resendRes.status, 200);
    const validOtp = deliveredOtp;
    assert.match(validOtp, /^\d{6}$/);

    const verifyRes = await fetch(`${base}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, otp: validOtp, name: "Test User" }),
    });
    assert.equal(verifyRes.status, 200);
    const authData = await verifyRes.json() as {
      access_token: string;
      refresh_token: string;
      user: { user_id: string; name: string; email: string; role: string };
      is_new_user: boolean;
    };
    assert.ok(authData.access_token);
    assert.ok(authData.refresh_token);
    assert.equal(authData.user.email, testEmail);
    assert.equal(authData.user.name, "Test User");
    assert.equal(authData.is_new_user, true);

    // 4. Test GET /auth/me
    const meRes = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${authData.access_token}` },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json() as { email: string };
    assert.equal(meData.email, testEmail);

    // 5. Test token refresh
    const refreshRes = await fetch(`${base}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: authData.refresh_token }),
    });
    assert.equal(refreshRes.status, 200);
    const refreshed = await refreshRes.json() as { access_token: string; refresh_token: string };
    assert.ok(refreshed.access_token);
    assert.ok(refreshed.refresh_token);

    // 6. Test logout
    const logoutRes = await fetch(`${base}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshed.access_token}` },
    });
    assert.equal(logoutRes.status, 204);

    // 7. Old refresh token should no longer work
    const oldRefreshRes = await fetch(`${base}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshed.refresh_token }),
    });
    assert.equal(oldRefreshRes.status, 401);

    await t.test("event duration and concurrent show creation remain consistent", async () => {
      const events = await import("../src/services/events.service.js");
      const shows = await import("../src/services/shows.service.js");
      const eventId = randomUUID(), venueId = randomUUID(), screenId = randomUUID();
      try {
        await pool.query("INSERT INTO events(event_id,type,title,duration) VALUES ($1,'movie','Concurrency test',90)", [eventId]);
        await pool.query("INSERT INTO venues(venue_id,name,address) VALUES ($1,'Test venue','Test address')", [venueId]);
        await pool.query("INSERT INTO screens(screen_id,venue_id,name) VALUES ($1,$2,'Test screen')", [screenId, venueId]);
        await pool.query('INSERT INTO seats(seat_id,screen_id,"row",number) VALUES ($1,$2,\'A\',1)', [randomUUID(), screenId]);
        const [update, creation] = await Promise.allSettled([
          events.update(eventId, { duration: 120 }),
          shows.adminCreate({ event_id: eventId, screen_id: screenId,
            start_time: new Date(Date.now() + 86400000).toISOString(), base_price: "100.00" }),
        ]);
        assert.equal(creation.status, "fulfilled");
        if (update.status === "rejected") assert.equal(update.reason.code, "EVENT_DURATION_LOCKED");
        const actual = await pool.query(
          "SELECT e.duration, EXTRACT(EPOCH FROM(s.end_time-s.start_time))/60 AS scheduled_duration FROM events e JOIN shows s USING(event_id) WHERE event_id=$1", [eventId]);
        assert.equal(Number(actual.rows[0].scheduled_duration), actual.rows[0].duration);
        await assert.rejects(events.update(eventId, { duration: 150 }), { code: "EVENT_DURATION_LOCKED" });
        if (creation.status === "fulfilled") {
          await assert.rejects(shows.adminUpdate(creation.value.show_id, { start_time: "2020-01-01T00:00:00Z" }), { status: 400 });
        }
      } finally {
        await pool.query("DELETE FROM shows WHERE event_id=$1", [eventId]);
        await pool.query("DELETE FROM seats WHERE screen_id=$1", [screenId]);
        await pool.query("DELETE FROM screens WHERE screen_id=$1", [screenId]);
        await pool.query("DELETE FROM venues WHERE venue_id=$1", [venueId]);
        await pool.query("DELETE FROM events WHERE event_id=$1", [eventId]);
      }
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
