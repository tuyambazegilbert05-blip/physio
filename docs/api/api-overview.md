# API overview

Route handlers under `src/app/api/` return JSON shaped as `{ data }` on success or `{ error: { message } }` on failure. Mutations validate request bodies with Zod and use the authenticated Supabase server client. RLS is enforced for direct and API-mediated database access. Email confirmation and recovery callbacks exchange one-time Supabase credentials in `src/app/auth/callback/route.ts`; the route accepts only same-origin local destinations.
