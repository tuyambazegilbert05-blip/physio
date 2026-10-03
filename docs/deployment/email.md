# Authentication email setup

Phyaio Cycle keeps Supabase Auth for account creation, email verification, sign-in, and password recovery. Supabase Auth submits these transactional emails to Brevo over SMTP. This keeps the existing auth flows and routes intact while Brevo handles delivery. The branded HTML templates are maintained in `emails/auth/`.

## Prepare Brevo

1. Add and authenticate the sending domain in Brevo. Publish its SPF/DKIM records and a DMARC policy in DNS.
2. Add and verify the sender address you want members to see, such as an address on your authenticated Phyaio Cycle domain.
3. In Brevo SMTP settings, copy the SMTP login and create an SMTP key. Use the SMTP key, not a Brevo API key or account password.
4. Keep Brevo click/open tracking disabled for these authentication emails. Link rewriting can invalidate Supabase’s one-time verification links.

Brevo’s SMTP relay is `smtp-relay.brevo.com`; this setup uses port `587` with STARTTLS. Brevo may assign a generated SMTP login, so copy the login displayed in its SMTP settings.

## Configure the hosted Supabase project

Add these temporary configuration values to the ignored `.env.local` file. Get the project reference from the Supabase project URL/dashboard and create a Management API access token in the Supabase account settings. The sender address must already be verified in Brevo.

```dotenv
SUPABASE_PROJECT_REF=your-project-reference
SUPABASE_ACCESS_TOKEN=your-supabase-management-token
BREVO_SMTP_LOGIN=your-brevo-smtp-login
BREVO_SMTP_KEY=your-brevo-smtp-key
Phyaio Cycle_AUTH_SENDER_EMAIL=your-verified-sender@your-domain
```

Then run:

```sh
pnpm auth:configure-email
```

The script patches only the Supabase Auth SMTP settings and five authentication email subjects/templates. It does not alter users, passwords, redirect allowlists, or database data. It reads the files in `emails/auth/` and does not print credentials. Once configuration succeeds, remove the temporary management token and Brevo SMTP values from `.env.local`; Supabase stores the SMTP credentials in the project Auth configuration. Never put these secrets in browser variables, hosting runtime variables, or source control.

If you prefer not to use the script, set the same SMTP settings in Supabase Dashboard → Authentication → SMTP Settings and paste the matching HTML/subjects from `emails/auth/` under Authentication → Email Templates.

## Verify delivery

1. Set the Supabase Auth Site URL to the deployed Phyaio Cycle origin, and allow that origin’s `/auth/callback` URL plus the local callback for development.
2. Confirm the SMTP sender name is `Phyaio Cycle` and the sender email is the verified Brevo sender.
3. In Supabase Auth, review rate limits for the application’s expected signup and recovery volume.
4. Register using a real mailbox, follow the confirmation button, and request a password reset. Confirm both links return to the matching Phyaio Cycle callback and complete successfully.
5. Inspect the email on mobile and desktop, including the logo, CTA, fallback URL, and footer. The logo uses the public PNG at `/icons/android-chrome-192x192.png`, so it must be served from the configured Site URL.

Supabase’s default mailer is restricted and rate limited; do not treat a successful development request as proof of production delivery. Keep Auth mail separate from marketing mail and monitor Brevo transactional delivery after launch.
