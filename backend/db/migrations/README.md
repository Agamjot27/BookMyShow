# SQL migrations and local seed

From the repository root:

```text
npm run db:check --workspace backend
npm run db:migrate --workspace backend
npm run db:seed --workspace backend
```

The runner serializes migrations with a PostgreSQL advisory lock. It owns the
transaction for each `.up.sql` file: SQL and the `schema_migrations` insert commit
or roll back together. Up files must not contain transaction-control statements
(PL/pgSQL function BEGIN/END blocks are fine). Use the runner, not direct psql,
so migration history is recorded. Existing down files are standalone, destructive
manual rollbacks; they are never executed automatically and history must be
reconciled explicitly if used.

No initial migration is inferred from existing tables. An untracked nonempty
public schema is rejected, including partially initialized databases. Inspect and
reconcile its full schema and migration history before retrying. The runner never
automatically baselines or resets it. Previously recorded history is trusted;
this change does not retroactively certify an old inferred migration record.

Seed requires local SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD. Matching accounts
are preserved; different credentials/roles cause failure. All demo writes share
one transaction and an advisory lock. Existing seat IDs are preserved and screen
geometry matches the seeded A–J / 1–10 grid. Shows use stable IDs and reuse the
original schedule date instead of creating a new week on every invocation. Times
are UTC: movies run on days 1–7, live events on days 8–11. A rerun does not refresh
expired demo dates. Screen locks and overlap checks prevent new scheduling
conflicts. Existing shows and bookings are never deleted/rescheduled: occupied
slots are skipped and pre-existing overlaps are reported for manual reconciliation.
