# Physio Fund Circle

Physio Fund Circle is a savings-group management application for member records, contributions, savings, loans, meetings, and reports. It uses Next.js App Router, React, TypeScript, Tailwind CSS, Supabase PostgreSQL, and row-level security.

## Run locally

1. Use Node.js 22.13 or newer and pnpm 12.3.4.
2. Install packages with `pnpm install`.
3. Create a Supabase project and copy its URL, publishable key, and server-only service credentials into `.env.local` using `.env.example` as a guide. Supply the project's legacy HS256 JWT signing secret as `SUPABASE_JWT_SECRET`; it is required for server-validated Physio Fund Circle sessions to reach existing `auth.uid()`-based RLS safely.
4. Apply every numbered migration in `database/migrations/` in order, including `020_application_auth`, or use the Supabase CLI with the migration files.
5. Start the app with `pnpm dev` and open `http://localhost:3000`.

Physio Fund Circle owns account passwords, application sessions, MFA, email verification, and password recovery. PostgreSQL remains hosted by Supabase; validated server sessions are the only source of user identity for database-scoped requests. Application email is sent through the server-side Brevo REST service. See [email setup](docs/deployment/email.md). Never expose service-role, JWT-signing, session, OTP, MFA-encryption, or Brevo secrets to browser code.

## Application commands

- `pnpm dev` starts the Next.js development server.
- `pnpm build` creates a production build.
- `pnpm start` serves the production build.
- `pnpm lint` runs ESLint.
- `pnpm typecheck` runs the TypeScript compiler without emitting files.
- `pnpm db:seed` creates the local development account and sample group. It is disabled in production.
- `pnpm db:reset -- --confirm-reset` recreates the local public schema and applies migrations. It requires `SUPABASE_DB_URL`, accepts localhost only, and is disabled in production.
- `pnpm db:types` generates database types from the configured Supabase project.

## Project map

- `src/app/` contains routes, layouts, API handlers, and route boundaries.
- `src/features/` contains domain components, schemas, service clients, and types.
- `src/components/` contains shared UI, layout, form, table, chart, and feedback components.
- `src/lib/supabase/` creates database clients; app identity and sessions are resolved in `src/lib/security/application-session.ts`.
- `database/migrations/` contains ordered PostgreSQL migrations and RLS policies.
- `src/animations/` documents and implements Motion, GSAP, Lottie, and React Three Fiber utilities.
- `docs/` contains product, architecture, API, design, and deployment documentation.

Financial operations are persisted in PostgreSQL. Group access is constrained by RLS, and balances include verified contributions, repayments, outstanding loans, and the configured group reserve. Read [database setup](database/README.md), [development instructions](docs/deployment/development.md), and [motion guidelines](docs/architecture/motion-system.md) before extending those areas.
# physio
# physio
# physio
