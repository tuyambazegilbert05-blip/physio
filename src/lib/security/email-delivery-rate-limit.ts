import { createHmac } from 'node:crypto'

function getRateLimitSecret() {
  const secret = process.env.AUTH_EMAIL_OTP_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('Email rate-limit hashing is not configured.')
  }
  return secret
}

function hashRateLimitValue(secret: string, purpose: string, value: string) {
  return createHmac('sha256', secret)
    .update(`ikimina-email-rate-limit:v1:${purpose}:${value}`)
    .digest('hex')
}

export function createRecoveryRateLimitHashes(email: string, request: Request) {
  const secret = getRateLimitSecret()
  const normalizedEmail = email.trim().toLowerCase()
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = request.headers.get('x-real-ip')?.trim() || forwardedIp || 'unknown'

  return {
    emailHash: hashRateLimitValue(secret, 'recovery-email', normalizedEmail),
    ipHash: hashRateLimitValue(secret, 'recovery-ip', ip),
  }
}
