# Frontend architecture

Physio Fund Circle uses the Next.js App Router with TypeScript source under `src/`. Route modules stay small: they select route parameters and compose reusable feature components. Client components own form interaction and browser state; server components load route data through cookie-aware Supabase clients.

## Source boundaries

- `src/app/` owns route entry points, layouts, API handlers, metadata, and loading or error boundaries.
- `src/features/<domain>/` owns domain components, Zod schemas, service calls, and feature types.
- `src/components/` owns reusable UI, layout, form, table, chart, provider, and feedback components.
- `src/lib/` owns shared Supabase clients, validation helpers, formatting, authorization helpers, and constants.
- `src/config/` owns site metadata, navigation, environment parsing, and permission maps.
- `src/types/` owns shared domain and generated database contracts.
- `src/animations/` owns animation technology adapters; `src/assets/` owns imported Lottie and Three.js assets.
- `src/styles/` owns design, animation, and utility tokens imported by `src/app/globals.css`.

The `@/` import alias points to `src/`. Publicly served files belong in `public/`; bundled assets belong in `src/assets/`.

## Routing and data

The `(auth)` route group provides sign-in, registration, email verification, and password recovery pages without changing their public URL. `/dashboard` routes share the dashboard navigation. Route handlers validate request bodies before using the authenticated user's Supabase client. PostgreSQL RLS is the final authorization boundary; a client-side group selection is a view preference, never an access-control mechanism.

The Next.js 16 session refresh entry point is `src/proxy.ts`. Keep session refresh there and keep database reads or writes in server components, server actions, or route handlers.

## Feature changes

Add or change a database contract in a migration, then update the matching `src/types/`, feature schema, service, route handler, and UI. Use the shared API response shape `{ data }` for successful requests and `{ error: { message } }` for errors. Do not put sample financial values in production components; empty states should describe when persisted records will appear.
