# Database views

`public.savings_summary` is a security-invoker view defined in migration `007_loans`. It aggregates verified contributions, approved/active loan balances, and group reserve adjustments. Since it runs with the caller’s permissions, its source tables and RLS policies remain part of the access-control boundary.
