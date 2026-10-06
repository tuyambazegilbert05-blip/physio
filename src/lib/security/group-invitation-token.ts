import { createHash, randomBytes } from 'node:crypto'
import { normalizeEmail } from './email-normalization.ts'

const tokenPattern = /^[A-Za-z0-9_-]{43}$/

export function createGroupInvitationToken() {
  return randomBytes(32).toString('base64url')
}

export function hashGroupInvitationToken(token: string) {
  if (!tokenPattern.test(token)) throw new Error('Invalid group invitation token.')
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function normalizeInvitationEmail(email: string) {
  return normalizeEmail(email)
}
