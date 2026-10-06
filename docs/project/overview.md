# Project overview

Physio Fund Cycle is a workspace for community savings groups. It supports independent membership and multi-role access, contribution collection and review, savings visibility, loan applications and decisions, meeting attendance, notifications, and reports. Users can hold multiple organizational or technical roles, and technical-only accounts do not become Physio Fund Cycle members or gain financial authority by default.

The web application uses Next.js App Router and TypeScript. Supabase provides PostgreSQL, row-level security, and email/password authentication. Membership is represented separately from group role assignments, and granular financial and administrative access is enforced through database policies.
