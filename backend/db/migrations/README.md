# SQL migrations

Apply numbered `.up.sql` files once, in order, against an empty database.
Each file owns its transaction. No migration tracking entity is added: the schema
contains exactly the eight TRD entities. Reapplying this initial migration fails
instead of silently masking schema drift. Do not mount both up and down files
into PostgreSQL's automatic initialization directory.

From repository root, the Node/pg commands use DATABASE_URL from the root `.env`:

```text
npm run db:check --workspace backend
npm run db:migrate --workspace backend
npm run db:seed --workspace backend
```

The migration command applies the existing initial SQL file unchanged and refuses
to run when public tables already exist. It does not automatically roll back or
reset a database. Seed requires SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD in
the local environment. Re-running seed preserves matching accounts and refuses
to overwrite accounts whose password or role differs.

From repository root, after starting Compose (PowerShell):

```powershell
Get-Content -Raw backend/db/migrations/001_initial_schema.up.sql | docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

For an existing local PostgreSQL installation, use:
`psql -v ON_ERROR_STOP=1 -d <connection-url> -f backend/db/migrations/001_initial_schema.up.sql`.

The matching down migration drops all eight tables and their data. It is provided
for deliberate local rollback only; no startup command executes it.

The migration includes the screen-membership trigger required by TRD.md.
Overlap checks, layout immutability, pricing, holds, and other service validations
remain unimplemented. The migration creates no accounts; the separate seed command creates local auth accounts only.
