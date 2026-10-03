# Phyaio Cycle

Phyaio Cycle is a savings-group management application for member records, contributions, savings, loans, meetings, and reports. It uses Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Auth, and PostgreSQL row-level security.

## Run locally

1. Use Node.js 22.13 or newer and pnpm 12.3.4.
2. Install packages with `pnpm install`.
3. Create a Supabase project and copy its URL and publishable key into `.env.local` using `.env.example` as a guide.
4. Apply every numbered migration in `database/migrations/` in order, or use the Supabase CLI with the migration files.
5. Start the app with `pnpm dev` and open `http://localhost:3000`.

Email/password registration uses Supabase Auth. Authentication email delivery uses Brevo SMTP; the branded templates live in `emails/auth/`. Follow [email setup](docs/deployment/email.md) to configure or deploy the templates and SMTP settings. Add the local and deployed `/auth/callback` URLs to the Supabase Auth redirect allow list. Never expose the service role key to browser code. It is only needed by `pnpm db:seed`.

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
- `src/lib/supabase/` creates browser, server, and route-handler Supabase clients.
- `database/migrations/` contains ordered PostgreSQL migrations and RLS policies.
- `src/animations/` documents and implements Motion, GSAP, Lottie, and React Three Fiber utilities.
- `docs/` contains product, architecture, API, design, and deployment documentation.

Financial operations are persisted in PostgreSQL. Group access is constrained by RLS, and balances include verified contributions, repayments, outstanding loans, and the configured group reserve. Read [database setup](database/README.md), [development instructions](docs/deployment/development.md), and [motion guidelines](docs/architecture/motion-system.md) before extending those areas.
# physio
# physio
