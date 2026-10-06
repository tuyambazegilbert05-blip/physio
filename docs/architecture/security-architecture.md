# Security architecture

- Physio Fund Cycle stores password hashes, opaque session-token hashes, MFA factors, and recovery tokens in server-only database tables. The browser receives only an HttpOnly `ikimina_session` cookie; no access token or password hash is returned.
- Sessions have a 12-hour lifetime when “keep me signed in” is off, otherwise a 30-day absolute lifetime and a seven-day inactivity timeout. Activity updates the server-side last-seen time; an expired or idle session must sign in again.
- Server routes validate that session against PostgreSQL before issuing a five-minute, server-signed database identity claim. The legacy Supabase JWT signing secret is server-only. PostgreSQL `auth.uid()` and the existing RLS/permission functions continue to enforce row access; never accept user IDs, roles, or permissions from the browser as identity.
- `src/proxy.ts` performs inexpensive cookie-presence routing only. Server layouts and API handlers resolve the session; authorization remains in handlers and PostgreSQL RLS, not in the proxy.
- Browser code uses the Supabase publishable key only for public database-independent configuration. Never expose the service-role key, JWT signing secret, session secret, MFA encryption key, OTP key, or database password to client code.
- Membership is stored independently from group-scoped role assignments. A user may hold several governance, financial, administrative, and technical roles, or a technical role without membership.
- RLS policies call database permission checks for every protected group-owned record. UI permission checks only shape the interface and are not the security boundary.
- Role assignments can only be granted or removed through permission-checked RPCs. The chairperson starts with committee and system-administrator roles; technical permissions do not imply financial approval or transaction permissions.
- Passwords are scrypt-hashed with per-password random salts and verified server-side. Login and recovery responses avoid account enumeration; rate limits are database-backed. Enabled MFA is required for marked sensitive APIs and authenticator setup/removal requires the current password.
- Audit rows record the actor, assigned roles, permission context, and before/after values for relevant financial and role-management actions. Do not log secrets or complete profile payloads.
