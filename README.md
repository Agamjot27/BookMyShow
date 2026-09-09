# BookMyShow Clone

A full-stack ticket booking platform: browse movies, standup shows, and concerts; select reserved seats with live availability; hold seats atomically during checkout; confirm bookings with stubbed payment; and manage the catalogue through an admin dashboard.

- [Product requirements](PRD.md)
- [Technical requirements](TRD.md)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, CSS Modules |
| Backend | Node.js 22, Express 5, TypeScript |
| Database | PostgreSQL — source of truth for catalogue, seats, and confirmed bookings |
| Cache / holds | Redis — atomic 5-minute seat holds via Lua scripts; MemoryStore fallback for local dev |
| Auth | Email OTP → JWT access token + rotating refresh token |
| Monorepo | npm workspaces (`frontend/`, `backend/`) |

---

## Implemented features

- **Browse events** — movies, standup, concerts with category filter and poster images
- **Event detail + showtimes** — upcoming shows with venue, date, time, and price
- **Live seat map** — row/column layout with real-time status polling every 1 second; pauses when tab is hidden; resumes on focus
- **Seat holds** — atomic all-or-nothing Redis hold for 1–6 seats; 5-minute countdown at checkout
- **Checkout + stubbed payment** — explicit success/failure stub; idempotent confirmation via `Idempotency-Key` header
- **Booking history + ticket detail** — confirmed bookings per user with full seat breakdown
- **Admin dashboard** — manage venues, screens, seat layouts, events, shows, bookings, and analytics
- **OTP authentication** — passwordless login via 6-digit email OTP; JWT access token + 30-day rotating refresh token; cross-tab session sync via `localStorage` + Web Locks

---

## Architecture overview

```
Browser (Next.js)
  │  /api/* proxied to Express
  ▼
Express API (Node.js)
  ├─ JWT middleware  →  PostgreSQL (pg pool, parameterized SQL, row-level locks)
  └─ Lua eval       →  Redis (atomic seat key set/release; MemoryStore fallback)
```

### OTP auth flow

1. `POST /api/auth/request-otp` — generates a 6-digit OTP, stores hash+TTL in Redis, sends via Gmail SMTP.
2. `POST /api/auth/verify-otp` — verifies OTP atomically; upserts user in PostgreSQL; issues JWT access token (1 h) + refresh token (30 days).
3. Frontend stores tokens in `localStorage`; auto-refreshes 60 s before expiry using `navigator.locks` to prevent concurrent tab races.
4. `POST /api/auth/logout` revokes all refresh tokens for the user.

### Redis seat holds

- `SET seat:{show_id}:{seat_id} {owner,token} NX PXAT {deadline}` — SETNX semantics with built-in expiry.
- A Lua script checks all requested seat keys then writes all of them atomically; if any seat is already held the entire operation is a no-op.
- Confirmed bookings are durable in PostgreSQL; Redis hold state is cache only.
- MemoryStore fallback (development): enabled by `REDIS_ALLOW_MEMORY_FALLBACK=true` + `NODE_ENV=development`. State is process-local — not safe for multi-process or multi-instance environments.

### PostgreSQL booking authority

- `UNIQUE (show_id, seat_id)` on `booking_seats` — the database backstop against double-booking.
- Every hold acquisition and booking confirmation locks the `shows` row (`SELECT … FOR UPDATE`) inside a short READ COMMITTED transaction, serializing concurrent mutations per show.
- Booking confirmation is idempotent: `Idempotency-Key` header + `request_hash` are stored permanently; retries return the original ticket.

---

## Local setup

**Requirements:** Node.js ≥ 22.14, PostgreSQL 15+, Redis 7+ (or use Docker Compose).

### 1. Clone and install

```powershell
git clone <repo-url>
cd bookmyshow
npm install
```

### 2. Environment

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

| Variable | What to set |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (keep in sync with `POSTGRES_*` if using Compose) |
| `REDIS_URL` | Redis connection string (default `redis://localhost:6379`) |
| `JWT_SECRET` | Random string ≥ 32 characters (see comment in `.env.example`) |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Gmail **App Password** (not your account password — see SMTP section below) |
| `SEED_ADMIN_EMAIL` | Email that will receive the `admin` role after seeding |

All other variables have working defaults for local development.

### 3. PostgreSQL setup

**Option A — Docker Compose (recommended):**

```powershell
docker compose up -d
```

**Option B — existing PostgreSQL:** create a database and set `DATABASE_URL` accordingly.

Run migrations (once, against an empty database):

```powershell
npm run db:migrate --workspace backend
```

### 4. Redis setup

**Option A — Docker Compose:** already started by `docker compose up -d`.

**Option B — no Redis:** set `NODE_ENV=development` and `REDIS_ALLOW_MEMORY_FALLBACK=true` in `.env`. The backend will fall back to an in-process MemoryStore. **This is single-process only** — seat hold atomicity across multiple backend instances requires real Redis.

### 5. Gmail App Password (SMTP)

OTP emails are sent via Gmail SMTP. To obtain an App Password:

1. Enable 2-Step Verification on your Google account.
2. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Create a new App Password (select "Mail" or "Other").
4. Copy the 16-character password into `SMTP_PASS` in `.env`.

### 6. Seed demo data

```powershell
npm run db:seed --workspace backend
```

This creates:

- 14 events (movies, standup, concerts) with posters
- 3 venues, 6 screens with 100 seats each (10 rows × 10 seats)
- A full week of shows from today
- Two user accounts (see below)

Reruns are fully idempotent — shows are anchored to the first existing seed show, not today's date.

### 7. Admin account

The seed upserts `SEED_ADMIN_EMAIL` (default `admin@example.test`) with `role='admin'`.

**To log in as admin:**

1. Set `SEED_ADMIN_EMAIL` in `.env` to an email address you can receive OTPs on.
2. Run `npm run db:seed --workspace backend`.
3. Start the backend and frontend.
4. Go to `http://localhost:3000`, click **Sign In**, enter that email, and verify the OTP.
5. Your session will have `role: "admin"`. The **Admin Dashboard** link appears in the navigation menu and header drawer.

> **Note:** No password is required or stored. Any email can be made admin by setting `SEED_ADMIN_EMAIL` and rerunning the seed — the seed safely promotes an existing user's role.

### 8. Run the applications

Open two terminals from the repository root:

```powershell
# Terminal 1 — backend (http://localhost:4000)
npm run dev:backend

# Terminal 2 — frontend (http://localhost:3000)
npm run dev:frontend
```

`/api` requests are proxied from the frontend to the backend automatically.

---

## Demo flow

1. Open `http://localhost:3000` — browse movies and events.
2. Click a movie → select a showtime → seat map opens.
3. Sign In (OTP to your email) → select seats → **Pay Now**.
4. At checkout, choose **Pay** (success) or **Fail Payment** to test both paths.
5. Confirm booking → view ticket under **My Bookings**.
6. Log in as admin (`SEED_ADMIN_EMAIL`) → **Admin Dashboard** appears in the nav.
7. Admin: create venues/events/shows, view bookings, check analytics.

---

## Verification

```powershell
# Typecheck
npm run typecheck --workspace backend
npm run typecheck --workspace frontend

# Tests (backend — includes concurrency and auth integration tests)
npm test --workspace backend

# Production build
npm run build --workspace backend
npm run build --workspace frontend
```

---

## Tests

| File | What it covers |
|---|---|
| `backend/tests/scaffold.test.ts` | Auth/admin route enforcement (no DB required) |
| `backend/tests/correctness.test.ts` | Schema validation, booking total, MemoryStore hold expiry |
| `backend/tests/concurrency.test.ts` | Hold race (A/A2), multi-seat atomicity (C/C2), DB booking uniqueness (B — requires Postgres) |
| `backend/tests/auth.test.ts` | Full OTP auth flow end-to-end (requires Postgres) |

Test B in `concurrency.test.ts` requires a live PostgreSQL connection and is skipped automatically when the database is unavailable.

---

## Admin workflow

| Task | Path |
|---|---|
| Create a venue | Admin → Venues → New Venue |
| Add a screen | Admin → Screens → New Screen |
| Configure seat layout | Admin → Screens → [screen] → Edit Layout |
| Create an event | Admin → Events → New Event |
| Schedule a show | Admin → Shows → New Show |
| View bookings | Admin → Bookings |
| Analytics | Admin → Dashboard |

Layout changes are blocked once any show references the screen. Show edits/deletes are blocked if holds or confirmed bookings exist.

---

## Known limitations

- **Fake payment** — the payment step is a client-side success/failure stub. No real payment gateway is integrated.
- **MemoryStore** — `REDIS_ALLOW_MEMORY_FALLBACK=true` enables an in-process store for local development without Redis. It does not provide cross-process or cross-instance hold atomicity. Production deployments require a real Redis instance.
- **Historical ticket metadata** — ticket detail pages display the current event/venue names from the catalogue. If an admin edits an event title after a booking is made, the ticket will reflect the updated name (no snapshot of names at booking time is stored).
- **Seed show dates** — shows are anchored to the first existing seed show date. If the database is fresh, shows start from today + 1 day and span one week. After that week passes, rerunning the seed will not move them forward — the anchor is frozen on the first run. To refresh dates, delete the show rows and reseed.
- **Single city** — the location picker is UI-only; all events are served regardless of selected city.
- **No real-time push** — seat availability is polled every 1 second. WebSocket/SSE is not implemented.
- **No email notifications** — booking confirmation emails are not sent. Only OTP emails are delivered via SMTP.
- **Profile editing** — the profile page is read-only. Name, phone, and birthday fields cannot be updated.
