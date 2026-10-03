# Development setup

1. Install Node.js 22 and pnpm 12.
2. Create a Supabase project or start a local project with the Supabase CLI.
3. Copy `.env.example` to `.env.local` and set the project URL and publishable key.
4. Apply the ordered SQL migrations in `database/migrations/` to that project.
5. Configure Supabase Auth email verification, password reset redirects, and local site URL for `http://localhost:3000`. Follow [email setup](email.md) to use the branded templates and Brevo SMTP for real email delivery.
6. Run `pnpm install` and `pnpm dev`.
