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
  controllers/       501 placeholders
  services/          Empty feature modules
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

## Current boundary

Pages are placeholders. All documented business endpoints return 501 after
applicable authentication/role checks. Anonymous admin API calls return 401;
authenticated non-admin calls return 403. Client gates deny access when no
session is present. Login, user lookup, seeded accounts, CRUD, seat holds,
payment, booking confirmation, and analytics are not implemented.

The in-memory auth provider is ready for a future login response; there is no
mock login or role bypass. PostgreSQL and Redis clients are configured, but
placeholder routes do not query them. SQL includes exactly the TRD's eight
entities, constraints, indexes, and booking-seat screen trigger. Schedule
overlap enforcement remains a service responsibility per the TRD.

The prior review's proposed PRD/TRD amendments are not applied by this scaffold.
