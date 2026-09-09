import assert from "node:assert/strict";
import test from "node:test";
import { createShowSchema, updateShowSchema, validateShowStart } from "../src/schemas/show.schema.js";
import { validateBookingTotal } from "../src/lib/booking-total.js";

test("show timestamps require valid future dates with explicit timezones; prices fit numeric(12,2)", () => {
  const input = { event_id: "00000000-0000-4000-8000-000000000001", screen_id: "00000000-0000-4000-8000-000000000002",
    start_time: "2096-02-29T12:00:00+05:30", base_price: "9999999999.99" };
  assert.equal(createShowSchema.safeParse(input).success, true);
  for (const start_time of ["2095-02-29T12:00:00Z", "2096-02-30T12:00:00Z", "2096-01-01", "2096-01-01T12:00:00", "01/02/2096", "2020-01-01T00:00:00Z", "2096-01-01T25:00:00Z"]) {
    assert.equal(createShowSchema.safeParse({ ...input, start_time }).success, false, start_time);
    assert.equal(updateShowSchema.safeParse({ start_time }).success, false, start_time);
    assert.throws(() => validateShowStart(start_time));
  }
  for (const base_price of ["10000000000", "-1", "1.001", "1e3"]) {
    assert.equal(createShowSchema.safeParse({ ...input, base_price }).success, false, base_price);
  }
  assert.doesNotThrow(() => validateBookingTotal("9999999999.99", 1));
  assert.doesNotThrow(() => validateBookingTotal("1666666666.66", 6));
  assert.throws(() => validateBookingTotal("1666666666.67", 6), { status: 400 });
  assert.throws(() => validateBookingTotal("9999999999.99", 2), { status: 400 });
});

test("development holds expire before replay and acquisition, including the exact deadline", async t => {
  Object.assign(process.env, { DATABASE_URL: "postgresql://test:test@localhost/test", REDIS_URL: "redis://localhost:6379",
    JWT_SECRET: "synthetic-correctness-secret-at-least-32-characters", JWT_ISSUER: "test", JWT_AUDIENCE: "test",
    SMTP_USER: "test@example.test", SMTP_PASS: "synthetic" });
  const { MemoryStore } = await import("../src/config/redis.js");
  const store = new MemoryStore();
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  const keys = ["hold:token", "seat:show:seat"];
  const args = ["user", "show", "token", '["seat"]'];
  assert.equal((store.evalShared("acquire", keys, args) as string[])[0], "created");
  assert.equal((store.evalShared("acquire", keys, args) as string[])[0], "existing");
  now += 300000;
  assert.equal((store.evalShared("acquire", keys, args) as string[])[0], "created");
  now += 300000;
  assert.equal((store.evalShared("acquire", keys, ["another-user", "show", "token", '["seat"]']) as string[])[0], "created");
});
