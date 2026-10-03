# Staging deployment

Use a dedicated staging Supabase project and separate site origin. Apply migrations before deploying application code that depends on the new schema. Configure Auth email templates and redirect allowlists, including `/auth/callback`, for the staging origin. Configure Brevo SMTP and deploy the branded templates using [email setup](email.md). Set the two public Supabase environment values in the hosting environment; do not copy production users or financial data into staging.
