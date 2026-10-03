# Production deployment

Use a production Supabase project with backups enabled, restricted dashboard membership, verified email delivery, and the exact production redirect allowlist. Add `/auth/callback` to the Auth redirect allowlist. Configure the verified Brevo sender and branded Supabase Auth templates using [email setup](email.md). Set only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the web runtime. Review RLS policies and migrations before each release, then deploy the app after the database migration completes.

Serve the Next.js app in a Node.js runtime. A manually triggered Vercel deployment workflow is included at `.github/workflows/deploy.yml`; configure `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub environment secrets before enabling it. Do not deploy with the service-role key in `NEXT_PUBLIC_*` variables, and do not seed development data into production.
