# Ticket Booking Platform

Project scaffold for a single Next.js App Router frontend and an Express API.

- [Product requirements](PRD.md)
- [Technical requirements](TRD.md)

## Structure

```text
frontend/src/app/
  (public)/          Event browsing, event details, seat map, login
  (user)/            Auth-gated checkout, bookings, ticket details
  (admin)/admin/     Admin-gated dashboard and management pages
frontend/src/components/  Auth provider, route gate, placeholder page
backend/src/
  routes/            TRD endpoint registrations
  controllers/       Auth handlers and remaining endpoint placeholders
  services/          Authentication service; other features pending
  middleware/        JWT authentication and role checks
  config/            Environment and Redis client configuration
backend/db/
  client.ts          pg pool
  transactions.ts    Single-client transaction helper
  repositories/      SQL repository destination
  migrations/        Initial schema and explicit rollback
```

## Local setup

Requires Node.js 22.14+ and Docker with Compose. Copy `.env.example` to `.env`
at repository root and replace JWT_SECRET with a random secret. Local database
credentials are examples; keep DATABASE_URL in sync if you change them.

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d
```

Apply the initial SQL migration using [migration instructions](backend/db/migrations/README.md).
Then run each application in its own terminal from repository root:

```text
npm run dev:backend
npm run dev:frontend
```

Frontend: http://localhost:3000. API: http://localhost:4000/api.
Next.js proxies /api requests to Express. Root .env is loaded by both applications;
backend secrets are not exposed as NEXT_PUBLIC variables.

## Verification

```text
npm run typecheck
npm test
npm run build
```

## Backend authentication

Registration and login are implemented; the frontend is not connected yet.
Run `npm run dev:backend` from the repository root.

| Endpoint | Request | Result |
|---|---|---|
| POST /api/auth/register | JSON `{name, email, password}` | 201 with `{access_token, expires_in, user}` |
| POST /api/auth/login | JSON `{email, password}` | 200 with `{access_token, expires_in, user}` |
| GET /api/auth/me | `Authorization: Bearer <access_token>` | Public user fields only |
| GET /api/me | Same as above | Alias of /api/auth/me |

Public registration always creates a normal user. Role fields are rejected.
Passwords require at least 12 characters and at most 72 UTF-8 bytes; passwords
are not trimmed. Email is trimmed and lowercased. Responses never expose hashes.
JWTs use HS256 with verified issuer, audience, subject, role, and expiration.
Roles are issued from database records; existing tokens expire naturally, so
manual role changes require re-login (no role-management API exists yet).

Errors follow `{error: {code, message, details}}`: invalid input is 400,
duplicate email is 409, wrong credentials or missing/invalid tokens are 401,
and a normal user accessing admin routes gets 403. Login and registration
share a 30-request/IP/15-minute limit (429). Throttling is in memory for this
single-process foundation; configure a shared store before scaling the API.

## Database and local accounts

DATABASE_URL must contain just the PostgreSQL URL, not a second assignment or
a pasted psql command. Existing environments should not be overwritten with
.env.example. No credentials are committed.

```text
npm run db:check --workspace backend
npm run db:migrate --workspace backend
npm run db:seed --workspace backend
```

Run migration once against an empty database. The seed creates one admin and
one normal user, using `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`,
`SEED_USER_EMAIL`, and `SEED_USER_PASSWORD` from root `.env`. Example emails
are `admin@example.test` and `user@example.test`; passwords have no defaults.
Rerunning seed does not reset passwords or promote existing users.

## Current boundary

Only the backend auth foundation is implemented. Other backend endpoints return
501 after applicable auth checks. Seat holds, booking confirmation, admin CRUD,
payment, analytics, password reset, and frontend auth integration remain pending.
The initial migration retains exactly the eight TRD entities and constraints.
Registration is a user-requested scope extension to the original PRD.

For a quick backend-only compile check:

```text
npm run typecheck --workspace backend
```

Next backend step: implement read-only event, showtime, and seat-layout APIs
against PostgreSQL before adding seat holds and booking transactions.
