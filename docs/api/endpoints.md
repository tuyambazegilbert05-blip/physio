# Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a Physio Fund Cycle account and session, then dispatch the app-owned verification OTP |
| GET, POST | `/api/auth/verify-email` | Read verification state or verify the signed-in account's app-owned email OTP |
| POST | `/api/auth/resend-verification` | Resend the app-owned email OTP under application rate limits |
| POST | `/api/auth/forgot-password` | Create a rate-limited, app-owned password recovery token and deliver it through Brevo |
| POST | `/api/auth/reset-password` | Validate and consume an app-owned single-use password reset token |
| POST | `/api/auth/login` | Verify application password and create an application session (or MFA challenge) |
| GET | `/api/auth/session` | Return safe account/session details for client auth state |
| POST | `/api/auth/logout` | Revoke the current session |
| PUT | `/api/auth/password` | Change password after verifying the current password |
| GET, POST, DELETE | `/api/auth/mfa` | Read, begin, or remove application TOTP MFA |
| POST | `/api/auth/mfa/verify` | Verify and enable authenticator MFA |
| POST | `/api/auth/mfa/login` | Complete or cancel an MFA sign-in challenge |
| GET | `/auth/callback` | Retired compatibility redirect to the app-owned password reset page |
| GET, PATCH | `/api/users` | Read or update the current profile; list/mark own notifications |
| GET, POST | `/api/groups` | List authorized groups or create a group and chair membership |
| GET, POST | `/api/members` | List or add group members |
| POST | `/api/members/claim` | Link the signed-in account to a matching verified member email |
| GET, POST, PATCH | `/api/invitations` | List, create, resend, or revoke invitations with the group permission `members:invite` |
| POST | `/api/invitations/status` | Read invitation details using its bearer token without exposing protected table fields |
| POST | `/api/invitations/accept` | Accept a valid invitation for the signed-in, email-matched account |
| POST | `/api/invitations/register` | Create the invited account and activate its Member access without a second OTP or join request |
| POST | `/api/invitations/decline` | Decline a valid invitation and notify its inviter |
| GET, POST, PATCH | `/api/contributions` | List, record pending, or review contributions |
| GET | `/api/savings` | Read the security-invoker savings summary |
| GET, POST, PATCH | `/api/loans` | List, apply, or decide loan applications |
| POST | `/api/loans/{loanId}/repayments` | Record a leader-confirmed repayment |
| GET, POST | `/api/meetings` | List or schedule group meetings |
| GET | `/api/reports` | Read financial or member report rows |
