import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

type EmailRecipient = {

  email: string
  name?: string
}

type SendEmailOptions = {
  to: EmailRecipient[]
  subject: string
  htmlContent: string
  textContent?: string
  replyTo?: EmailRecipient
}

function getEmailConfig() {
  const apiKey = process.env.BREVO_SMTP_KEY
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ||
    process.env.PhyaioCycle_AUTH_SENDER_EMAIL ||
    'physiocycle.help@gmail.com'
  const senderName = process.env.BREVO_SENDER_NAME || 'Phyaio Cycle'

  return { apiKey, senderEmail, senderName }
}

/**
 * Base method to dispatch transactional emails through Brevo REST API v3
 */
export async function sendTransactionalEmail(options: SendEmailOptions) {
  const { apiKey, senderEmail, senderName } = getEmailConfig()

  if (!apiKey) {
    console.warn('[Brevo] BREVO_SMTP_KEY is not defined. Email dispatch skipped.')
    return { success: false, error: 'Missing Brevo API key' }
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: options.to,
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent,
        replyTo: options.replyTo,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Brevo] API Error (${response.status}):`, errorText)
      return { success: false, error: errorText }
    }

    const data = await response.json()
    return { success: true, messageId: data.messageId }
  } catch (error) {
    console.error('[Brevo] Network error during email dispatch:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email dispatch error',
    }
  }
}

/**
 * Branded responsive HTML email envelope
 */
function createBrandedEmailTemplate({
  headline,
  bodyHtml,
  actionUrl,
  actionLabel,
}: {
  headline: string
  bodyHtml: string
  actionUrl?: string
  actionLabel?: string
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${headline}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F8FAFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#081233;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F8FAFF;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;">
            <!-- Brand Header -->
            <tr>
              <td align="center" style="padding-bottom:28px;">
                <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#081233;">
                  phyaio cycle
                </div>
                <div style="font-size:12px;font-weight:600;color:#657089;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">
                  Group Savings Platform
                </div>
              </td>
            </tr>

            <!-- Card Content -->
            <tr>
              <td style="padding:36px 36px;background:#ffffff;border:1px solid rgba(99,102,241,0.12);border-radius:24px;box-shadow:0 18px 40px -10px rgba(36,55,245,0.08);">
                <h1 style="margin:0 0 16px;color:#081233;font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1.25;">
                  ${headline}
                </h1>
                <div style="color:#4B5563;font-size:15px;line-height:1.65;">
                  ${bodyHtml}
                </div>

                ${
                  actionUrl && actionLabel
                    ? `
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:32px;">
                  <tr>
                    <td align="center" style="border-radius:14px;background:#7B3FF2;">
                      <a href="${actionUrl}" style="display:inline-block;padding:14px 28px;border-radius:14px;background:#7B3FF2;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 10px 24px -4px rgba(123,63,242,0.4);">
                        ${actionLabel}
                      </a>
                    </td>
                  </tr>
                </table>
                `
                    : ''
                }
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding-top:28px;color:#94A3B8;font-size:12px;line-height:1.7;">
                <p style="margin:0 0 8px;">
                  Secured with 256-bit encryption. Automated communications from Phyaio Cycle.
                </p>
                <a href="${siteUrl}/dashboard" style="color:#2437F5;text-decoration:none;font-weight:600;">Go to Dashboard</a>
                <span style="padding:0 8px;">•</span>
                <a href="${siteUrl}/dashboard/settings" style="color:#2437F5;text-decoration:none;font-weight:600;">Notification Settings</a>
                <p style="margin:12px 0 0;font-size:11px;">
                  © ${new Date().getFullYear()} Phyaio Cycle. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/**
 * Dispatch an account notification email
 */
export async function sendNotificationEmail({
  toEmail,
  toName,
  title,
  message,
  actionUrl,
  actionLabel,
}: {
  toEmail: string
  toName?: string
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
}) {
  const htmlContent = createBrandedEmailTemplate({
    headline: title,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hello ${toName || 'Member'},</p>
      <p style="margin:0 0 16px;">${message}</p>
    `,
    actionUrl,
    actionLabel,
  })

  return sendTransactionalEmail({
    to: [{ email: toEmail, name: toName }],
    subject: `[Phyaio Cycle] ${title}`,
    htmlContent,
    textContent: `${title}\n\n${message}\n\n${actionUrl ? `Visit: ${actionUrl}` : ''}`,
  })
}

/**
 * Dispatch contribution verification receipt
 */
export async function sendContributionReceiptEmail({
  toEmail,
  toName,
  amount,
  currency,
  groupName,
  period,
}: {
  toEmail: string
  toName: string
  amount: number
  currency: string
  groupName: string
  period: string
}) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'RWF',
    maximumFractionDigits: 0,
  }).format(amount)

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hello <strong>${toName}</strong>,</p>
    <p style="margin:0 0 16px;">Your savings contribution has been verified by your group leadership.</p>
    
    <div style="background:#F8FAFF;border:1px solid #E2E8F0;border-radius:16px;padding:20px;margin:20px 0;">
      <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;">Amount Recorded</div>
      <div style="font-size:26px;font-weight:800;color:#081233;margin:4px 0 12px;">${formattedAmount}</div>
      <div style="font-size:13px;color:#475569;">Group: <strong>${groupName}</strong></div>
      <div style="font-size:13px;color:#475569;">Period: <strong>${period}</strong></div>
      <div style="font-size:13px;color:#16A34A;font-weight:700;margin-top:6px;">✓ Status: Verified</div>
    </div>
  `

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  return sendTransactionalEmail({
    to: [{ email: toEmail, name: toName }],
    subject: `Contribution Confirmed: ${formattedAmount} recorded for ${groupName}`,
    htmlContent: createBrandedEmailTemplate({
      headline: 'Contribution Receipt',
      bodyHtml,
      actionUrl: `${siteUrl}/dashboard/contributions`,
      actionLabel: 'View Contributions',
    }),
  })
}

/**
 * Dispatch loan approval/rejection decision
 */
export async function sendLoanDecisionEmail({
  toEmail,
  toName,
  amount,
  currency,
  groupName,
  status,
  reason,
}: {
  toEmail: string
  toName: string
  amount: number
  currency: string
  groupName: string
  status: 'approved' | 'rejected'
  reason?: string
}) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'RWF',
    maximumFractionDigits: 0,
  }).format(amount)

  const isApproved = status === 'approved'

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hello <strong>${toName}</strong>,</p>
    <p style="margin:0 0 16px;">
      Your loan request in <strong>${groupName}</strong> has been <strong>${status}</strong>.
    </p>

    <div style="background:${isApproved ? '#F0FDF4' : '#FFF1F2'};border:1px solid ${isApproved ? '#BBF7D0' : '#FECDD3'};border-radius:16px;padding:20px;margin:20px 0;">
      <div style="font-size:12px;font-weight:700;color:${isApproved ? '#166534' : '#9F1239'};text-transform:uppercase;">Requested Amount</div>
      <div style="font-size:24px;font-weight:800;color:#081233;margin:4px 0 8px;">${formattedAmount}</div>
      <div style="font-size:13px;font-weight:700;color:${isApproved ? '#16A34A' : '#E11D48'};">Status: ${status.toUpperCase()}</div>
      ${reason ? `<div style="font-size:13px;color:#475569;margin-top:8px;">Note: ${reason}</div>` : ''}
    </div>
  `

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  return sendTransactionalEmail({
    to: [{ email: toEmail, name: toName }],
    subject: `Loan Decision: ${isApproved ? 'Approved' : 'Declined'} - ${groupName}`,
    htmlContent: createBrandedEmailTemplate({
      headline: `Loan Request ${isApproved ? 'Approved' : 'Declined'}`,
      bodyHtml,
      actionUrl: `${siteUrl}/dashboard/loans`,
      actionLabel: 'Check Loan Status',
    }),
  })
}

/**
 * Dispatch password recovery email with branded template
 */
export async function sendAuthRecoveryEmail({
  toEmail,
  actionUrl,
}: {
  toEmail: string
  actionUrl: string
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  let htmlContent: string

  try {
    const rawTemplate = await readFile(join(process.cwd(), 'emails/auth/recovery.html'), 'utf-8')
    htmlContent = rawTemplate
      .replaceAll('{{ .SiteURL }}', siteUrl)
      .replaceAll('{{ .Email }}', toEmail)
      .replaceAll('{{ .ConfirmationURL }}', actionUrl)
  } catch (error) {
    console.warn('[Brevo] Failed to read recovery.html, using fallback template:', error)
    htmlContent = createBrandedEmailTemplate({
      headline: 'Reset your password',
      bodyHtml: `
        <p style="margin:0 0 16px;">We received a request to reset your password for <strong>${toEmail}</strong>.</p>
        <p style="margin:0 0 16px;">Click the button below to choose a new password for your account.</p>
      `,
      actionUrl,
      actionLabel: 'Reset Password',
    })
  }

  return sendTransactionalEmail({
    to: [{ email: toEmail }],
    subject: 'Reset your Phyaio Cycle password',
    htmlContent,
    textContent: `Reset your Phyaio Cycle password:\n\n${actionUrl}\n\nIf you didn't request this, you can ignore this email.`,
  })
}

/**
 * Dispatch account confirmation email with branded template
 */
export async function sendAuthConfirmationEmail({
  toEmail,
  actionUrl,
}: {
  toEmail: string
  actionUrl: string
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  let htmlContent: string

  try {
    const rawTemplate = await readFile(join(process.cwd(), 'emails/auth/confirmation.html'), 'utf-8')
    htmlContent = rawTemplate
      .replaceAll('{{ .SiteURL }}', siteUrl)
      .replaceAll('{{ .Email }}', toEmail)
      .replaceAll('{{ .ConfirmationURL }}', actionUrl)
  } catch (error) {
    console.warn('[Brevo] Failed to read confirmation.html, using fallback template:', error)
    htmlContent = createBrandedEmailTemplate({
      headline: 'Confirm your email address',
      bodyHtml: `
        <p style="margin:0 0 16px;">Welcome to Phyaio Cycle! Please confirm your email address <strong>${toEmail}</strong> to activate your account.</p>
      `,
      actionUrl,
      actionLabel: 'Confirm Email Address',
    })
  }

  return sendTransactionalEmail({
    to: [{ email: toEmail }],
    subject: 'Confirm your Phyaio Cycle account',
    htmlContent,
    textContent: `Confirm your Phyaio Cycle account:\n\n${actionUrl}\n\nIf you didn't create an account, you can ignore this email.`,
  })
}

