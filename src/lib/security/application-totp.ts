import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function getEncryptionKey() {
  const value = process.env.AUTH_MFA_ENCRYPTION_KEY
  if (!value || !/^[0-9a-f]{64}$/i.test(value)) throw new Error('AUTH_MFA_ENCRYPTION_KEY must be a 32-byte hexadecimal key.')
  return Buffer.from(value, 'hex')
}

export function generateTotpSecret() {
  return encodeBase32(randomBytes(20))
}

export function encodeBase32(bytes: Uint8Array) {
  let output = ''
  let buffer = 0
  let bits = 0
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += base32Alphabet[(buffer >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += base32Alphabet[(buffer << (5 - bits)) & 31]
  return output
}

export function decodeBase32(value: string) {
  let buffer = 0
  let bits = 0
  const output: number[] = []
  for (const char of value.toUpperCase().replace(/=+$/g, '')) {
    const index = base32Alphabet.indexOf(char)
    if (index < 0) throw new Error('Invalid authenticator secret.')
    buffer = (buffer << 5) | index
    bits += 5
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(output)
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.')
}

export function decryptTotpSecret(encrypted: string) {
  const [ivValue, tagValue, ciphertextValue, extra] = encrypted.split('.')
  if (!ivValue || !tagValue || !ciphertextValue || extra !== undefined) throw new Error('Invalid stored authenticator factor.')
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8')
}

function codeForStep(secret: string, step: number) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return number.toString().padStart(6, '0')
}

export function verifyTotp(secret: string, input: string, at = Date.now()) {
  if (!/^\d{6}$/.test(input)) return null
  const currentStep = Math.floor(at / 30_000)
  for (const step of [currentStep - 1, currentStep, currentStep + 1]) {
    const candidate = Buffer.from(codeForStep(secret, step))
    const supplied = Buffer.from(input)
    if (candidate.length === supplied.length && timingSafeEqual(candidate, supplied)) return step
  }
  return null
}

export function createTotpSetupUrl(secret: string, email: string) {
  const label = `Ikimina:${email}`
  const query = new URLSearchParams({ secret, issuer: 'Ikimina', algorithm: 'SHA1', digits: '6', period: '30' })
  return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`
}
