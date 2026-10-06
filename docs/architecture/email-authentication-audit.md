# Historical Phase 0: Email and Authentication Delivery Audit

> **Superseded on 2026-10-04 by the application-auth migration.** This document records the prior Supabase Auth design and is retained as historical context only. Do not use its former Option C recommendation, endpoint descriptions, or Supabase Auth configuration steps as current instructions. Current behavior and required configuration are documented in [Authentication and transactional email](../deployment/email.md) and the application-auth migration `020_application_auth`.

**Reviewed:** 2026-10-04  
**Scope:** Repository source, migrations, templates, scripts, and local configuration variable names. No application behavior or hosted configuration was changed.

## Executive Summary

Supabase Auth remains the identity, password, session, refresh, MFA, and recovery-token authority. The application currently owns registration email verification: it creates a six-digit OTP, stores a keyed hash through database functions, and sends the code using Brevo's REST API. The active password-reset route asks Supabase to generate a recovery link, then sends that link through Brevo. Membership approval/rejection messages also use Brevo. Most other operational notices are in-app notifications, not email.

The repository therefore already has a hybrid design close to **Option C**. Keep Supabase Auth for identity and token lifecycle; retain application-owned OTP only for the explicit app email-verification flow; use the application mailer for those messages and transactional email. Do not add a second authentication or authorization system.

Two deployment facts remain unverified: whether migration 016 and the intended Supabase Auth settings are live, and whether the deployed runtime has a Brevo REST API key. The local app helper falls back to a Brevo SMTP key in the REST `api-key` header; Brevo documents these as different credential types. Local REST delivery is therefore likely misconfigured unless that fallback value is actually a REST API key. No test email was sent and no secret values are recorded here.

## Current Architecture

| Flow | Actual execution path and ownership |
|---|---|
| Registration verification | `RegisterView` → `SignUpCard` → `/api/auth/register` → Supabase `auth.signUp` creates the password account/session → application OTP helper → database RPC stores challenge hash/limits → Brevo REST sends code. `/api/auth/verify-email` hashes the submitted code and calls the verification RPC. Supabase does not generate or validate this app OTP. |
| Login and sessions | `SignInCard` → `/api/auth/login` → Supabase `signInWithPassword`; the route checks the app-owned verified-email record. Supabase SSR browser/server clients manage the session cookies; `src/proxy.ts` refreshes/authenticates requests. MFA uses Supabase MFA. Logout calls Supabase Auth. |
| Password recovery | `ForgotPasswordCard` → `/api/auth/forgot-password` → server-only Supabase admin `generateLink(type: 'recovery')` → Brevo REST recovery email → `/auth/callback` validates/exchanges the Supabase credential → `ResetPasswordCard` calls Supabase `updateUser({ password })`. Supabase generates and validates the recovery credential but does not send this active route's email. |
| Membership decision | Authorized API request → `review_group_join_request` database RPC commits the decision and its in-app notification → API sends approved/rejected email through Brevo. Email failure is logged after the decision commits; there is no retry/outbox. A submitted join request does not itself send an email. |

The active route set is distinct from older feature forms: `src/features/auth/components/ForgotPasswordForm.tsx` still calls `auth.resetPasswordForEmail` directly and would invoke Supabase email delivery if mounted; the active forgot-password page mounts `ForgotPasswordCard` instead. The feature `RegisterForm` also calls the application API. The active `SignUpCard` redirects to verification without using the API's `emailSent` result, so a carrier failure can look like a code was sent. The current auth callback accepts Supabase code exchange and `recovery`, `magiclink`, `invite`, and `email_change` OTP types, but repository callers do not initiate all of those types.

## Email Inventory

| Email / category | Generator, validator, sender, and template | Trigger, limits, and failure behavior |
|---|---|---|
| Registration verification OTP | App generates with Node `crypto.randomInt` (six decimal digits, about 19.9 bits); app validates through `verify_email_verification_code`. HMAC-SHA-256 binds the code to the normalized email; DB stores the HMAC, not plaintext. Inline template in `src/lib/email/brevo.ts`; Brevo REST sends. | Registration or authenticated resend. Challenge expires in 10 minutes, permits at most 5 attempts, and is single-use; successful verification deletes it. Issuance limits are 3/account/15 minutes and 10/IP/hour. A new issue replaces the prior challenge. Migration 016 defines these objects; deployment status is unknown. Delivery is synchronous, without retry or durable send log. |
| Password reset / recovery | Supabase Auth admin `generateLink` creates the action link; Supabase callback and Auth validate it. Brevo REST sends `emails/auth/recovery.html`. | Forgot-password API. This bypasses Supabase's email-send quota, but there is no app-level rate limiter or delivery queue. Unknown-address errors return a generic success; other generation errors are returned. Carrier failure returns 500. The dormant `resetPasswordForEmail` form would send through Supabase if reactivated. |
| Membership approved/rejected | App API sends with `sendMembershipDecisionEmail`; inline Brevo template/helper. Database RPC records the decision; database trigger creates an in-app notification. | Reviewer PATCH after commit. A send failure only logs a warning; no retry or persisted provider message ID. No joining-request-received email was found. |
| Group invitation | No application send/generate caller found. The database has `group_invitations` storage/policies and the auth configuration script installs `emails/auth/invite.html`; no `inviteUserByEmail` or equivalent caller is present. | Not an active email flow in this repository. If activated through Supabase Auth, it would use configured Supabase SMTP and its Auth email limits. |
| Magic link and email change | Templates and callback token types exist; no active `signInWithOtp`, magic-link generation, or email-change update caller was found. | Dormant. Future Supabase Auth-generated messages would use Supabase's configured SMTP/templates and Auth email limits. |
| Contributions, loans, repayments, announcements, other operations | Database functions/triggers create in-app `notifications`; no external email dispatch is called. Brevo contribution-receipt and loan-decision helpers exist but have no callsites. | In-app only in the inspected implementation. No email queue, cron sender, or email webhook was found. |
| Generic delivery test | Authenticated `/api/email/test` calls Brevo `sendNotificationEmail`; no template file, inline content. | Request may specify an arbitrary recipient; no role check is present. Treat as a test-only surface and restrict before production use. Success returns the provider message ID but does not persist it. |

No native Supabase signup-confirmation template is present in `emails/auth/`; the custom auth configuration script sets `mailer_autoconfirm=true` and does not install one. If the hosted setting differs, `auth.signUp` may follow Supabase's native confirmation behavior and return no session; the registration API explicitly fails in that case. The script is intended configuration, not proof of live configuration.

## Supabase Dependency Map

- **Supabase Auth:** account creation, password hashing/checking, access and refresh sessions, MFA, and recovery/action token creation and validation. The app does not replace these responsibilities.
- **Application API:** registration orchestration, app OTP issuance/resend/validation, app verified-email checks, Brevo transactional dispatch, and membership-decision email dispatch.
- **Supabase database:** migration 016 defines app verification records, OTP challenges/rate buckets, verification RPCs, and app-side access checks. Existing database role/permission functions and RLS remain the authorization authority. Keep membership, roles, and permissions separate from email verification.
- **Admin/service-role client:** active recovery link generation and privileged membership-request reads. It does not generate or validate the app OTP. Keep its credential server-only.
- **Infrastructure:** no Supabase Edge Function, repository Supabase config directory, email webhook, scheduled sender, queue, or external email call from a database trigger was found. Trigger documentation explicitly says not to send email from triggers; inspected triggers write in-app notifications/audit data.

The app OTP has six-digit `randomInt` generation, 10-minute expiry, a five-attempt ceiling, single-use deletion, normalized-email binding, HMAC-SHA-256 storage, and database issuance limits. The HMAC secret is server-only and required to be at least 32 characters. There is no durable outbound email event log or OTP-attempt audit history: the current challenge is deleted on success, or when verification is attempted after expiry/exhaustion, while verification time and rate-limit buckets remain. Confirm that the deployment proxy overwrites forwarded-IP headers before relying on them for the IP issuance limit.

## Rate-Limit Exposure

Supabase's email-send limits apply to messages sent by Supabase Auth, not to the app's direct Brevo REST requests. Supabase documents a built-in email service limit of 2 messages/hour and a default custom-SMTP limit of 30/hour when not otherwise configured; `scripts/configure-auth-email.ts` sets `rate_limit_email_sent` to 5 and `rate_limit_verify` to 10. These are intended settings only; actual project values were not verified. See [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp) and [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

- **App OTP registration/resend:** not counted as Supabase Auth email sends; limited by the app's DB buckets and Brevo API limits. It still requires Supabase `signUp` to create a session under the configured auto-confirm behavior.
- **Active password recovery:** `generateLink` creates a Supabase credential but does not send email; the email-send quota is not used by this path. Supabase Auth API protections and Brevo limits still apply. The app has no explicit recovery-request throttle.
- **Native Auth messages:** dormant invite/magic-link/email-change flows and any direct `resetPasswordForEmail` caller use Supabase Auth delivery and are exposed to Auth email limits.
- **Membership decision and test email:** direct Brevo sends; not exposed to Supabase email-send limits. Brevo's API has its own rate limits; current code has no queue/retry. See [Brevo send transactional email](https://developers.brevo.com/reference/send-transac-email) and [API limits](https://developers.brevo.com/docs/api-limits).

## Existing Email Carrier and Configuration

`src/lib/email/brevo.ts` makes a synchronous POST to Brevo's transactional email REST endpoint, with an `api-key` header, sender/recipient, HTML, optional text, and an optional reply-to. A successful call returns a provider message ID. The repository does not persist the ID, query delivery status, consume bounce/delivery webhooks, retry failed sends, or queue work. Brevo documents webhook events, but none are wired into this app ([transactional webhooks](https://developers.brevo.com/docs/transactional-webhooks)).

The project also configures Brevo SMTP for Supabase Auth using `BREVO_SMTP_LOGIN` and `BREVO_SMTP_KEY`; this is separate from the REST API key required by the `api-key` header ([Brevo API key authentication](https://developers.brevo.com/docs/api-key-authentication), [SMTP keys](https://help.brevo.com/hc/en-us/articles/7959631848850-Create-and-manage-your-SMTP-keys)). The local environment has the SMTP credential variable but not `BREVO_API_KEY`; the REST helper falls back to `BREVO_SMTP_KEY`. This is a likely local direct-send configuration error, not a confirmed delivery failure; no email was sent to test it.

| Configuration | Classification and use |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy anon-key fallback) | **PUBLIC** Supabase client configuration. |
| `NEXT_PUBLIC_SITE_URL` | **PUBLIC** origin used for recovery URLs; route falls back to request origin. It is absent from the inspected local environment. |
| `AUTH_EMAIL_OTP_SECRET` | **SERVER ONLY / APPLICATION MANAGED** HMAC and IP-bucket secret. |
| `BREVO_API_KEY` | **SERVER ONLY / EMAIL-CARRIER MANAGED** REST delivery credential. |
| `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY` | **SERVER ONLY / EMAIL-CARRIER MANAGED** credentials for Supabase SMTP. |
| `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `PhyaioCycle_AUTH_SENDER_EMAIL` | Sender configuration, not secret; app and auth-config script use overlapping names. Sender/domain verification is carrier-managed. |
| `SUPABASE_SERVICE_ROLE_KEY` | **SERVER ONLY / SUPABASE MANAGED** elevated database/Auth client key; used by recovery link and privileged API operations. |
| `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` | Project identifier and **SERVER ONLY / SUPABASE MANAGED** Management API credential for the local configuration script. |
| `SUPABASE_DB_URL` | **SERVER ONLY / SUPABASE MANAGED** database connection configuration used by maintenance tooling. |

`.env.example` has sender/seed variable names containing spaces, while code expects `PhyaioCycle_...`; it also omits some runtime names used by the mail helper/docs. Treat the example file and deployment guide as configuration drift to correct in a later implementation phase. Secret values are intentionally not included in this audit.

## Recommended Architecture and Ordered Migration Plan

**Recommendation: Option C, the hybrid already represented in the code.** Keep Supabase Auth for accounts, password/session lifecycle, MFA, and recovery-token validation. Keep the app OTP for app-owned email verification, with application-side issuance limits and Brevo delivery. Use the app mailer for transactional group messages. For any future native Auth email, keep Supabase's supported SMTP or an Auth email hook; do not build a second token system. Supabase documents `admin.generateLink` as link/OTP generation for a custom sender—the method does not itself deliver the email ([`generateLink` reference](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)).

1. Confirm hosted Supabase Auth settings, redirects, actual email limits, verified sender, and whether migration 016 is applied. The repository includes a Management API configuration script, but its local read-only configuration check could not reach the Management API; no remote change was made.
2. Separate credentials by purpose: require a Brevo REST API key for app sends and SMTP credentials only for Supabase SMTP. Correct the environment example and sender-name drift; verify configured sender and redirect origins.
3. Keep a single active verification route: app OTP → app database checks → Brevo. Preserve its expiry, attempt, replay, email-binding, rate-limit, and self-scoped authorization guarantees. Do not treat Supabase's auto-confirm flag as app verification.
4. Keep recovery as Supabase-generated and Supabase-validated token plus one chosen delivery path. If the Brevo direct path remains, add appropriate app throttling, operational logging/retry policy, and generic responses without exposing account existence. Remove or redirect the dormant direct-Supabase reset form so it cannot create a competing send path.
5. Decide whether group invites, magic-link sign-in, email change, and operational transactional emails are product requirements. Implement only the selected flows with explicit single ownership and documented templates/limits.
6. For post-commit messages such as membership decisions, add durable dispatch/retry (for example, an outbox) if delivery must be guaranteed. Restrict the arbitrary-recipient delivery-test route to an administrator or remove it from production.
7. Add provider status/bounce handling if required, then stage-verify delivery, callback redirects, OTP expiry/replay/limits, recovery, role/RLS gates, and failure handling. Update auth/email documentation and remove obsolete claims that Supabase sends the app verification code.

## Risks

| Risk | Level | Evidence / implication |
|---|---|---|
| Email verification and password recovery | **High** | Security-sensitive flows. OTP state exists only in migration 016; migration deployment is unknown. Recovery relies on correct callback allowlists, app throttling, and reliable carrier delivery. Preserve Supabase token validation. |
| REST/SMTP credential confusion | **High operational** | Local runtime lacks `BREVO_API_KEY`; helper may put an SMTP key in a REST API-key header. Verification/recovery delivery may fail until corrected. |
| Hosted config drift | **High operational** | The script's auto-confirm, SMTP, and limit settings are not verified against the hosted project. A mismatch can make signup return no session or activate Supabase-native confirmation delivery. |
| Membership decision email | **Medium** | DB decision commits before Brevo call; no retry/outbox means a transient send error loses the email while in-app notice remains. |
| Verification delivery UX | **Medium** | Active signup UI ignores the API's `emailSent` result and can send a user to the code screen after carrier failure without explaining delivery failed. |
| Dormant competing Auth forms | **Medium** | `resetPasswordForEmail` can reintroduce Supabase email delivery if an old form is mounted. Invitation/magic-link/email-change templates imply configuration but have no caller. |
| Test route / observability | **Medium** | Any authenticated caller can choose a test recipient; send IDs and delivery state are not durably tracked. |
| Email examples/docs | **Low to Medium** | `.env.example` names do not match code; existing flow docs still describe Supabase email verification. Misconfiguration and operational confusion are likely. |

## Open Questions

- What are the actual hosted values for `mailer_autoconfirm`, SMTP, `rate_limit_email_sent`, `rate_limit_verify`, redirect allowlist, and is migration 016 applied? The Management API read failed; no live setting is asserted here.
- Does the deployed runtime have a valid Brevo REST API key separately from its SMTP key, and is the sender/domain verified? Local variable presence suggests the REST key is missing, but deployed secrets were not inspected.
- Are invitation, magic-link, email-change, and additional transaction emails intended near-term features, or should their dormant templates/config be removed later?
- Must membership decision email delivery be guaranteed/retried after the database decision commits?
- What production site origin should recovery use, and does it match Supabase's allowed redirect URLs?

## Definition of Done

- A single documented sender and owner exists for each active email flow; no unintended Supabase-native confirmation/reset path remains.
- Supabase Auth remains the authority for identity, passwords, sessions, MFA, and recovery-token validation; existing membership/role/permission/RLS checks remain authoritative and unchanged.
- App OTP uses the deployed migration and retains hashed storage, expiration, attempt limits, single-use behavior, issuance limits, email binding, and authorized self-scoped verification.
- REST and SMTP credentials, sender, site origin, and hosted Auth settings are separately configured and verified without exposing secrets.
- Recovery, registration, membership decisions, and any selected additional email flows have documented rate limits, delivery failures, logging, and retry expectations.
- Staging checks verify delivered mail, redirects, expiration/replay/rate limits, recovery, and authorization; provider delivery/bounce monitoring is enabled where required.
- Frontend/backend/configuration/docs contain no competing active implementations or stale claims about who sends or validates each email.
