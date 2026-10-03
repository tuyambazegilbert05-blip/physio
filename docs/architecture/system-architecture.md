# System architecture

The browser renders the Next.js App Router UI. Client components call same-origin route handlers for mutations and lists. Route handlers create cookie-aware Supabase clients with the publishable key; PostgreSQL row-level security scopes data to the authenticated user and active group membership. Supabase Auth manages credentials, email verification, and password recovery.

No service-role key is used by the web application. SQL migrations, not application startup, define the database schema and policies.
