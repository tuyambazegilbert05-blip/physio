# System architecture

The browser renders the Next.js App Router UI. Client components call same-origin route handlers for private data and mutations. Ikimina validates its opaque server-side session cookie, then creates a short-lived server-signed PostgREST identity so PostgreSQL's existing `auth.uid()`-based RLS and group permission resolver continue to scope data. Supabase supplies PostgreSQL only; Ikimina manages password credentials, sessions, application MFA, email verification, and recovery tokens. Brevo REST delivers application emails.

The service-role key is used only by server-side account/session/authentication operations and narrowly scoped administrative services. It is never sent to a browser. SQL migrations, not application startup, define the database schema and policies.
