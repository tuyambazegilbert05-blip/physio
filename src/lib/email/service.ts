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

export type EmailSendFailureReason =
  | 'configuration_missing'
  | 'provider_rejected'
  | 'network_failure'
  | 'unexpected_response'

export type EmailSendResult =
  | { success: true; messageId: string }
  | { success: false; reason: EmailSendFailureReason; statusCode?: number }

function getEmailConfig() {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME || 'Phyaio Cycle'

  return { apiKey, senderEmail, senderName }
}

/**
 * Base method to dispatch transactional emails through Brevo REST API v3
 */
export async function sendTransactionalEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const { apiKey, senderEmail, senderName } = getEmailConfig()

  if (!apiKey || !senderEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    console.error('[Email] Brevo REST delivery is not configured.')
    return { success: false, reason: 'configuration_missing' }
  }

  let response: Response
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
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

  } catch (error) {
    console.error('[Email] Brevo REST request failed.', {
      reason: error instanceof Error ? error.name : 'UnknownError',
    })
    return { success: false, reason: 'network_failure' }
  }

  if (!response.ok) {
    console.error('[Email] Brevo rejected a transactional email request.', {
      status: response.status,
    })
    return { success: false, reason: 'provider_rejected', statusCode: response.status }
  }

  let data: { messageId?: unknown }
  try {
    data = await response.json()
  } catch {
    console.error('[Email] Brevo returned an unreadable success response.')
    return { success: false, reason: 'unexpected_response', statusCode: response.status }
  }
  if (typeof data?.messageId !== 'string' || !data.messageId) {
    console.error('[Email] Brevo success response did not include a message ID.')
    return { success: false, reason: 'unexpected_response', statusCode: response.status }
  }
  return { success: true, messageId: data.messageId }
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]!
  })
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
  siteUrl: requestSiteUrl,
}: {
  toEmail: string
  actionUrl: string
  siteUrl?: string
}) {
  const siteUrl = requestSiteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
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

export async function sendEmailVerificationOtp({
  toEmail,
  code,
}: {
  toEmail: string
  code: string
}) {
  const safeEmail = escapeHtml(toEmail)
  const htmlContent = createBrandedEmailTemplate({
    headline: 'Verify your email address',
    bodyHtml: `
      <p style="margin:0 0 14px;">Use this one-time code to confirm that you own <strong>${safeEmail}</strong>.</p>
      <div style="margin:24px 0;padding:20px;text-align:center;border:1px solid #e8defe;border-radius:16px;background:#f8f5ff;">
        <span style="font-size:32px;line-height:1.2;font-weight:800;letter-spacing:0.35em;color:#5a36e8;">${escapeHtml(code)}</span>
      </div>
      <p style="margin:0;color:#647089;font-size:13px;">This code expires shortly and can only be used once. If you did not create this account, ignore this email.</p>
    `,
  })
  return sendTransactionalEmail({
    to: [{ email: toEmail }],
    subject: 'Your Phyaio Cycle email verification code',
    htmlContent,
    textContent: `Your Phyaio Cycle verification code is ${code}. It expires shortly and can only be used once.`,
  })
}

export async function sendMembershipDecisionEmail({
  toEmail,
  toName,
  groupName,
  groupId,
  approved,
  message,
}: {
  toEmail: string
  toName: string
  groupName: string
  groupId: string
  approved: boolean
  message?: string | null
}) {
  const safeName = escapeHtml(toName)
  const safeGroupName = escapeHtml(groupName)
  const safeMessage = message ? escapeHtml(message) : ''
  const headline = approved
    ? 'Your Ikimina request was approved'
    : 'An update on your Ikimina request'
  const status = approved ? 'approved' : 'not approved'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const actionUrl = approved
    ? `${siteUrl}/dashboard/onboarding?group=${encodeURIComponent(groupId)}`
    : `${siteUrl}/dashboard/join`
  return sendTransactionalEmail({
    to: [{ email: toEmail, name: toName }],
    subject: `[Phyaio Cycle] ${headline}`,
    htmlContent: createBrandedEmailTemplate({
      headline,
      bodyHtml: `<p style="margin:0 0 14px;">Hello ${safeName},</p><p style="margin:0 0 14px;">Your request to join <strong>${safeGroupName}</strong> was ${status}.</p>${approved ? '<p>You are now a Member. Continue with group onboarding to review the group information, rules, and contribution details before opening your personal Member space.</p>' : '<p>You do not have Member access to this Ikimina. You can review other available groups from your account.</p>'}${safeMessage ? `<p style="margin-top:16px;padding:14px;border-radius:12px;background:#f8f5ff;color:#4b5563;">Message from the Ikimina: ${safeMessage}</p>` : ''}`,
      actionUrl,
      actionLabel: approved ? 'Continue Member onboarding' : 'Review my request',
    }),
    textContent: `Hello ${toName}, your request to join ${groupName} was ${status}.${message ? ` Message: ${message}` : ''}${approved ? ' Continue with group onboarding before opening your Member space.' : ''}\n\n${actionUrl}`,
  })
}

export async function sendGroupInvitationEmail({
  toEmail,
  toName,
  inviterName,
  groupName,
  expiresAt,
  acceptUrl,
  declineUrl,
}: {
  toEmail: string
  toName?: string | null
  inviterName: string
  groupName: string
  expiresAt: string
  acceptUrl: string
  declineUrl: string
}) {
  const safeInvitee = escapeHtml(toName || 'there')
  const safeInviter = escapeHtml(inviterName)
  const safeGroup = escapeHtml(groupName)
  const date = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(expiresAt))
  const safeAcceptUrl = escapeHtml(acceptUrl)
  const safeDeclineUrl = escapeHtml(declineUrl)
  const htmlContent = createBrandedEmailTemplate({
    headline: `You are invited to join ${safeGroup}`,
    bodyHtml: `
      <p style="margin:0 0 14px;">Hello ${safeInvitee},</p>
      <p style="margin:0 0 14px;"><strong>${safeInviter}</strong> invited you to become a Member of <strong>${safeGroup}</strong>.</p>
      <p style="margin:0 0 14px;">Accepting activates your membership in this group. You will then complete a short group onboarding that covers group information, rules, any required member details, and the configured contribution and share information before opening your personal Member space.</p>
      <p style="margin:0 0 14px;">This invitation grants Member access only. It does not assign administrative or financial approval responsibilities, and onboarding confirmations do not record payments.</p>
      <p style="margin:0;color:#647089;font-size:13px;">This invitation expires on ${escapeHtml(date)}. If you were not expecting it, you can decline it or ignore this message.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
        <tr>
          <td align="center" style="border-radius:14px;background:#7B3FF2;">
            <a href="${safeAcceptUrl}" style="display:inline-block;padding:14px 24px;border-radius:14px;background:#7B3FF2;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">ACCEPT INVITATION</a>
          </td>
          <td width="12"></td>
          <td align="center" style="border-radius:14px;border:1px solid #d9d2ea;background:#ffffff;">
            <a href="${safeDeclineUrl}" style="display:inline-block;padding:13px 20px;border-radius:14px;color:#39285e;font-size:14px;font-weight:700;text-decoration:none;">DECLINE INVITATION</a>
          </td>
        </tr>
      </table>
    `,
  })
  return sendTransactionalEmail({
    to: [{ email: toEmail, name: toName ?? undefined }],
    subject: `[Phyaio Cycle] Invitation to join ${groupName}`,
    htmlContent,
    textContent: `Hello ${toName || 'there'}, ${inviterName} invited you to join ${groupName}. Accepting activates your Member membership. You will then complete group onboarding to review its information and requirements before opening your personal Member space. Member onboarding does not record a payment. This invitation does not assign administrative or financial approval responsibilities. It expires on ${date}.\n\nAccept invitation: ${acceptUrl}\n\nDecline invitation: ${declineUrl}`,
  })
}
