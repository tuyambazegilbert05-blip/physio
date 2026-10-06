# Authentication and transactional email

Physio Fund Circle owns application authentication: accounts, password hashes, sessions, MFA, email verification, and password recovery. Supabase is used for PostgreSQL only. Application email is sent server-side through the centralized Brevo REST service.

## Required server configuration

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=https://your-deployed-origin
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
SUPABASE_JWT_SECRET=the-projects-legacy-hs256-jwt-signing-secret
AUTH_SESSION_SECRET=at-least-32-random-bytes
AUTH_EMAIL_OTP_SECRET=at-least-32-random-bytes
AUTH_MFA_ENCRYPTION_KEY=64-hex-characters-for-32-random-bytes
BREVO_API_KEY=your-brevo-rest-api-key
BREVO_SENDER_EMAIL=your-verified-sender@your-domain
BREVO_SENDER_NAME=Physio Fund Circle
```

`SUPABASE_JWT_SECRET` must be the actual signing secret configured for the project's legacy HS256 JWT verification. The server issues a five-minute authenticated database claim only after validating a Physio Fund Circle session; this preserves the current `auth.uid()`-based RLS policies. Do not generate a replacement value, expose it to the browser, or use the service-role key as a substitute. If the project no longer accepts legacy HS256 JWTs, the database identity/RLS bridge must be migrated before app-authenticated requests can work.

Generate the app-owned secrets with a cryptographically secure random source. Keep them stable across deployments so sessions, MFA factors, verification, and rate-limit records remain valid. `AUTH_MFA_ENCRYPTION_KEY` must decode from hex to exactly 32 bytes. Do not print or commit secret values.

`BREVO_API_KEY` is required for the REST API. SMTP login/key are a separate credential type and are never used as REST authentication. The legacy `BREVO_SMTP_LOGIN` and `BREVO_SMTP_KEY` variables may remain in a deployment secret store for other explicitly configured services, but no active application auth flow reads them.

## Application flows

- Registration creates an application profile, scrypt password credential, and hashed opaque session, then issues a six-digit HMAC-protected verification OTP (10-minute expiry, five attempts, single use, database issuance limits) and sends it through Brevo.
- Password recovery returns the same public response for known and unknown email addresses. For a matching account, the API stores only a SHA-256 reset-token hash, expires it after 30 minutes, and emails the raw token link through Brevo. A successful reset consumes the token and revokes existing sessions.
- Membership decisions use the existing authorized database workflow. The transaction and in-app notification commit independently of email delivery; approval/rejection mail is sent afterward through Brevo.
- Invitations are app-owned and use the shared email service. Invitation acceptance is tied to the invited normalized email and existing group authorization rules.
- Routine contribution, loan, repayment, announcement, and system notifications remain in-app unless the product explicitly adds a separate email trigger.

All provider HTTP calls live in `src/lib/email/service.ts`. The browser never receives provider credentials. Public routes receive generic responses and safe error messages; server logs omit passwords, OTP values, reset tokens, session tokens, and provider secrets.

## Database rollout

Apply migrations in numeric order through `020_application_auth` before deploying this authentication code. Migration 020 preserves profile UUIDs, repoints public foreign keys from `auth.users` to `public.profiles`, and creates private credential, session, reset, rate-limit, TOTP, and login-challenge tables. It intentionally does not copy Supabase password hashes; existing users without an app credential must use password recovery to set one.

Do not run the local destructive reset script against a hosted database. Verify the migration on a disposable/staging project first and confirm the public tables still have RLS enabled and the role/permission policies remain present.

## Troubleshooting

- Registration/login returning service unavailable: check required app secrets and database connectivity. A missing `SUPABASE_JWT_SECRET` blocks authenticated database access by design.
- Verification/recovery mail not delivered: verify `BREVO_API_KEY`, sender identity, Brevo account status, and provider request result. SMTP credentials cannot fix a missing REST key.
- Existing account cannot sign in after migration: if it has no row in `app_password_credentials`, use the password recovery flow to establish an app-owned password.
- Do not configure Supabase Auth auto-confirm, callbacks, or SMTP for the app-owned registration/recovery path.
