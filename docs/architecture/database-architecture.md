# Database architecture

Supabase PostgreSQL stores profiles, groups, members, contributions, savings adjustments, loans, repayments, meetings, attendance, notifications, and audit events. Monetary columns use constrained whole-unit numeric fields. Group foreign keys and row-level policies keep records inside a user’s authorized groups.

Apply `database/migrations/` in numeric order. The `savings_summary` view is security-invoker and derives confirmed collection and outstanding loan balances from persisted records. Never edit a migration already applied to a shared environment; add a follow-up migration.
