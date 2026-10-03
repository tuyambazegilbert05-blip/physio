# Database triggers

Triggers are installed by migrations and keep cross-request invariants inside PostgreSQL. Profile creation follows Auth registration; `updated_at` is set by the database; repayment inserts atomically lower the related loan balance; loan status updates are checked for valid transitions and available funds; selected finance and membership mutations emit audit records.

Keep trigger functions short, transactional, and idempotent where possible. Do not send email or call external services from a database trigger.
