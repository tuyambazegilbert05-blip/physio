# Database

The application stores identity in Supabase Auth and group, membership, role assignment, contribution, savings, loan, meeting, attendance, notification, and audit data in PostgreSQL. Membership is independent from group roles, so a technical user can be assigned access without becoming a member. Every financial and group-owned table has row-level security enabled; application routes use the signed-in user's Supabase client so those policies remain active.

## Migrations

Apply all numbered files in order. They define shared enums, profiles, groups, membership, contributions, savings adjustments, loans, the savings summary, meetings, attendance, notifications, audit records, restricted grants, verified-email member claims, and multi-role access control. Use the Supabase SQL editor or Supabase CLI in a development project first. Treat applied migrations as immutable; add a new numbered migration for later changes. The `schema/` directory contains topic-oriented SQL references and `seeds/` contains local-only sample data.

## Security and money

Do not use a service role key in a browser bundle or ordinary API handler. Routes use the user's cookie-backed session; PostgreSQL RLS enforces group membership and granular permission checks derived from multiple group-scoped role assignments. The chairperson receives committee and system-administrator roles when a group is created; technical roles do not grant financial permissions. Amounts use whole-unit `numeric(15,0)` storage and the API validates positive whole values. Contributions count toward balances only after verification. Repayment entries are append-only and update a loan's outstanding amount through a database trigger.

`savings_summary` is a read-only database view gated by the group's `financial:read` permission. The group's raw reserve balance is not selectable from the base `groups` table by authenticated clients. Use the summary view for displayed totals; do not update calculated totals directly. Group creation uses the `create_group` RPC to create the group, its first membership, and the chairperson's default roles atomically. Role assignments can only be changed through permission-checked RPCs; direct table writes are not granted to authenticated clients.

## Local development data

`pnpm db:seed` loads `.env.local` and requires the Supabase URL, service role key, and `Phyaio Cycle_SEED_PASSWORD`. It idempotently creates development auth accounts and sample rows across all application tables; generated audit rows are written by database triggers. Never run it against production data. `pnpm db:reset -- --confirm-reset` requires `SUPABASE_DB_URL` and refuses non-local hosts; it recreates the public schema and applies every numbered migration in one transaction. Both scripts are disabled when `NODE_ENV=production`. The SQL files in `seeds/` are for an isolated development database only.
