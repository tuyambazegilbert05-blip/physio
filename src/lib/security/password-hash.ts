import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'

const scryptCost = 32_768
const scryptBlockSize = 8
const scryptParallelization = 1
const keyLength = 64
const maxMemory = 64 * 1024 * 1024

function deriveKey(password: string, salt: Uint8Array) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, {
      N: scryptCost,
      r: scryptBlockSize,
      p: scryptParallelization,
      maxmem: maxMemory,
    }, (error, derivedKey) => error ? reject(error) : resolve(derivedKey))
  })
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await deriveKey(password, salt)
  return `scrypt$${scryptCost}$${scryptBlockSize}$${scryptParallelization}$${salt.toString('base64url')}$${key.toString('base64url')}`
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, cost, blockSize, parallelization, saltValue, keyValue, extra] = encoded.split('$')
  if (algorithm !== 'scrypt' || extra !== undefined || !cost || !blockSize || !parallelization || !saltValue || !keyValue) return false
  const N = Number(cost)
  const r = Number(blockSize)
  const p = Number(parallelization)
  if (N !== scryptCost || r !== scryptBlockSize || p !== scryptParallelization) return false
  try {
    const salt = Buffer.from(saltValue, 'base64url')
    const expected = Buffer.from(keyValue, 'base64url')
    if (salt.length !== 16 || expected.length !== keyLength) return false
    const actual = await deriveKey(password, salt)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
