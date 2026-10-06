# Database functions

The migration-defined functions centralize policy-safe behavior:

- `set_updated_at()` assigns the persisted update time.
- `create_application_account(...)` creates a profile, private password credential, and hashed session atomically.
- `create_group(...)` creates a group, its chairperson membership, and the chairperson, committee-member, and system-administrator assignments atomically.
- `is_group_member(uuid)`, `current_group_roles(uuid)`, and `current_group_permissions(uuid)` expose only the current caller’s group access for RLS checks.
- `has_group_permission(uuid, text)` is the database authorization check used by group policies.
- `assign_group_role(...)` and `remove_group_role(...)` safely manage roles by registered account email and enforce separate technical and organizational assignment rules.
- `apply_loan_repayment()` updates the outstanding amount inside the repayment transaction.
- `guard_loan_transition()` validates the decision sequence and checks available funds before approval.
- `write_financial_audit()` records actor roles, permission context, and before/after values for relevant operational and role-assignment changes.
- `claim_member(uuid)` links only an active, unclaimed member record whose email matches the caller's verified application account email.

Application-auth functions use service-role-only grants unless a current-user RPC is explicitly part of the signed application database session. Definitions live in the ordered migration files. Review security-definer search paths and grants whenever a function changes.
