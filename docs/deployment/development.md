# Development setup

1. Install Node.js 22.13 or newer and pnpm 12.3.4.
2. Create a Supabase project or start a local project with the Supabase CLI.
3. Copy `.env.example` to `.env.local`. Set the Supabase URL, publishable key, service-role key, legacy JWT signing secret, and strong random `AUTH_SESSION_SECRET`, `AUTH_EMAIL_OTP_SECRET`, and `AUTH_MFA_ENCRYPTION_KEY` values. Set `BREVO_API_KEY` and sender values to deliver transactional email.
4. Apply the ordered SQL migrations in `database/migrations/` to that project, including migration 020.
5. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and verify the required server-only values are available to the app.
6. Run `pnpm install` and `pnpm dev`.
