import { redis } from "../config/redis.js";
import { ApiError } from "./api-error.js";
import type { HoldRecord } from "../types/hold.js";

const seatKey = (show: string, seat: string) => `seat:${show}:${seat}`;
const holdKey = (token: string) => `hold:${token}`;

// All validation happens before any writes; Redis runs the script indivisibly.
const ACQUIRE = `
local old = redis.call('GET', KEYS[1])
local seats = cjson.decode(ARGV[4])
if old then
  local h = cjson.decode(old)
  if h.user_id ~= ARGV[1] or h.show_id ~= ARGV[2] or #h.seat_ids ~= #seats then return {'conflict'} end
  for i, id in ipairs(seats) do if h.seat_ids[i] ~= id then return {'conflict'} end end
  for i = 2, #KEYS do
    local raw = redis.call('GET', KEYS[i])
    if not raw then return {'expired'} end
    local s = cjson.decode(raw)
    if s.hold_token ~= ARGV[3] or s.user_id ~= ARGV[1] then return {'expired'} end
  end
  return {'existing', old}
end
for i = 2, #KEYS do if redis.call('EXISTS', KEYS[i]) == 1 then return {'unavailable'} end end
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local deadline = now + 300000
local h = cjson.encode({user_id=ARGV[1], show_id=ARGV[2], hold_token=ARGV[3], seat_ids=seats, expires_at=deadline})
local s = cjson.encode({user_id=ARGV[1], hold_token=ARGV[3], expires_at=deadline})
for i = 2, #KEYS do redis.call('SET', KEYS[i], s, 'NX', 'PXAT', deadline) end
redis.call('SET', KEYS[1], h, 'NX', 'PXAT', deadline)
return {'created', h}
`;

// Metadata is immutable for a hold. Comparing the exact snapshot prevents a
// delayed release from touching replacement metadata or replacement seat keys.
const CHECK_OR_RELEASE = `
local raw = redis.call('GET', KEYS[1])
if not raw or raw ~= ARGV[1] then return 'expired' end
local h = cjson.decode(raw)
if h.user_id ~= ARGV[2] or h.show_id ~= ARGV[3] then return 'forbidden' end
local valid = true
for i = 2, #KEYS do
  local seat = redis.call('GET', KEYS[i])
  if seat then
    local s = cjson.decode(seat)
    if s.user_id == h.user_id and s.hold_token == h.hold_token then
      if ARGV[4] == 'release' then redis.call('DEL', KEYS[i]) end
    else valid = false end
  else valid = false end
end
if ARGV[4] == 'release' then redis.call('DEL', KEYS[1]); return 'released' end
if not valid or redis.call('PTTL', KEYS[1]) <= 0 then return 'expired' end
return 'valid'
`;

export async function acquire(userId: string, showId: string, token: string, seatIds: string[]) {
  const result = await redis.evalShared(ACQUIRE, [holdKey(token), ...seatIds.map(id => seatKey(showId, id))],
    [userId, showId, token, JSON.stringify(seatIds)]) as string[];
  if (result[0] === "unavailable") throw new ApiError(409, "SEATS_UNAVAILABLE", "One or more seats are held");
  if (result[0] === "conflict") throw new ApiError(409, "HOLD_TOKEN_CONFLICT", "Hold token already has a different owner or selection");
  if (result[0] === "expired") throw new ApiError(409, "HOLD_EXPIRED", "Hold is no longer active");
  return { created: result[0] === "created", record: JSON.parse(result[1]) as HoldRecord };
}

export async function checkOrRelease(userId: string, showId: string, token: string, release = false): Promise<HoldRecord | null> {
  const raw = await redis.evalShared("return redis.call('GET', KEYS[1])", [holdKey(token)], []) as string | null;
  if (!raw) return null;
  const record = JSON.parse(raw) as HoldRecord;
  if (record.user_id !== userId || record.show_id !== showId) throw new ApiError(404, "HOLD_NOT_FOUND", "Hold not found");
  const status = await redis.evalShared(CHECK_OR_RELEASE,
    [holdKey(token), ...record.seat_ids.map(id => seatKey(showId, id))], [raw, userId, showId, release ? "release" : "check"]);
  if (status === "forbidden") throw new ApiError(404, "HOLD_NOT_FOUND", "Hold not found");
  return status === "expired" ? null : record;
}

export async function readSeatHolds(showId: string, seatIds: string[]) {
  if (!seatIds.length) return [];
  const result = await redis.evalShared("return redis.call('MGET', unpack(KEYS))", seatIds.map(id => seatKey(showId, id)), []) as (string | null)[];
  return result.map(raw => raw ? JSON.parse(raw) as { user_id: string; expires_at: number } : null);
}
