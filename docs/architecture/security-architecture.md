# Security architecture

- Supabase Auth issues cookie-backed sessions through `@supabase/ssr`.
- Next.js `src/proxy.ts` refreshes the session and protects dashboard routes. Authorization remains in server handlers and PostgreSQL RLS; the proxy is not the sole security boundary.
- Browser and request clients use only the Supabase publishable key. Never expose a service-role or database password to client code.
- Membership is stored independently from group-scoped role assignments. A user may hold several governance, financial, administrative, and technical roles, or a technical role without membership.
- RLS policies call database permission checks for every protected group-owned record. UI permission checks only shape the interface and are not the security boundary.
- Role assignments can only be granted or removed through permission-checked RPCs. The chairperson starts with committee and system-administrator roles; technical permissions do not imply financial approval or transaction permissions.
- Login errors are generic. Password storage and verification are delegated to Supabase Auth.
- Audit rows record the actor, assigned roles, permission context, and before/after values for relevant financial and role-management actions. Do not log secrets or complete profile payloads.
