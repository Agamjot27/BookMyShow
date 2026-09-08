# SQL migrations

Apply numbered `.up.sql` files once, in order, against an empty database.
Each file owns its transaction. No migration tracking entity is added: the schema
contains exactly the eight TRD entities. Reapplying this initial migration fails
instead of silently masking schema drift. Do not mount both up and down files
into PostgreSQL's automatic initialization directory.

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
remain unimplemented. No seed accounts or business records are created.
