import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const required = [
  'SUPABASE_PROJECT_REF',
  'SUPABASE_ACCESS_TOKEN',
  'BREVO_SMTP_LOGIN',
  'BREVO_SMTP_KEY',
  'PhyaioCycle_AUTH_SENDER_EMAIL',
] as const

function getRequiredValue(name: (typeof required)[number]) {
  const value = process.env[name]
  if (!value?.trim()) throw new Error(`Missing ${name}. Set it in .env.local before running this command.`)
  return value
}

const values = Object.fromEntries(required.map((name) => [name, getRequiredValue(name)])) as Record<(typeof required)[number], string>

if (!/^[a-z0-9-]+$/i.test(values.SUPABASE_PROJECT_REF)) {
  throw new Error('SUPABASE_PROJECT_REF must contain only letters, numbers, and hyphens.')
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.PhyaioCycle_AUTH_SENDER_EMAIL)) {
  throw new Error('PhyaioCycle_AUTH_SENDER_EMAIL must be a valid email address verified in Brevo.')
}

const templates = [
  ['confirmation', 'Confirm your PhyaioCycle account', 'confirmation.html'],
  ['recovery', 'Reset your PhyaioCycle password', 'recovery.html'],
  ['magic_link', 'Your secure PhyaioCycle sign-in link', 'magic-link.html'],
  ['invite', 'You’re invited to PhyaioCycle', 'invite.html'],
  ['email_change', 'Confirm your new PhyaioCycle email', 'email-change.html'],
] as const

const config: Record<string, string | number | boolean> = {
  external_email_enabled: true,
  smtp_admin_email: values.PhyaioCycle_AUTH_SENDER_EMAIL,
  smtp_host: 'smtp-relay.brevo.com',
  smtp_port: 587,
  smtp_user: values.BREVO_SMTP_LOGIN,
  smtp_pass: values.BREVO_SMTP_KEY,
  smtp_sender_name: 'PhyaioCycle',
}

for (const [type, subject, filename] of templates) {
  config[`mailer_subjects_${type}`] = subject
  config[`mailer_templates_${type}_content`] = await readFile(resolve('emails/auth', filename), 'utf8')
}

const endpoint = `https://api.supabase.com/v1/projects/${values.SUPABASE_PROJECT_REF}/config/auth`
let response: Response
try {
  response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${values.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  })
} catch {
  throw new Error('Could not reach the Supabase Management API. Check your network and try again.')
}

if (!response.ok) {
  throw new Error(`Supabase rejected the auth email configuration (HTTP ${response.status}). Check the project reference, access token permissions, verified Brevo sender, and SMTP credentials in your local environment.`)
}

console.log('Supabase Auth is configured to deliver branded authentication emails through Brevo SMTP.')
console.log('Applied templates: confirmation, recovery, magic link, invitation, and email change.')
console.log('Check Supabase Auth rate limits, the sender-domain DNS records, and one real registration/reset email before launch.')
