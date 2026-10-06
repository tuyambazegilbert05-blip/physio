import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { sendTransactionalEmail } from '../src/lib/email/service.ts'

const originalFetch = globalThis.fetch
const previousEnvironment = new Map<string, string | undefined>()
const emailVariables = [
  'BREVO_API_KEY',
  'BREVO_SMTP_KEY',
  'BREVO_SENDER_EMAIL',
  'BREVO_SENDER_NAME',
]

function rememberEnvironment() {
  for (const name of emailVariables) previousEnvironment.set(name, process.env[name])
}

function restoreEnvironment() {
  for (const [name, value] of previousEnvironment) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  previousEnvironment.clear()
  globalThis.fetch = originalFetch
}

function configureEmail(apiKey = 'test-rest-key') {
  process.env.BREVO_API_KEY = apiKey
  process.env.BREVO_SENDER_EMAIL = 'no-reply@example.test'
  process.env.BREVO_SENDER_NAME = 'Ikimina Test'
}

afterEach(restoreEnvironment)

test('requires the REST API key and never substitutes the SMTP key', async () => {
  rememberEnvironment()
  delete process.env.BREVO_API_KEY
  process.env.BREVO_SMTP_KEY = 'smtp-only-secret'
  process.env.BREVO_SENDER_EMAIL = 'no-reply@example.test'
  let called = false
  globalThis.fetch = async () => {
    called = true
    return Response.json({ messageId: 'unexpected' })
  }

  const result = await sendTransactionalEmail({
    to: [{ email: 'member@example.test' }],
    subject: 'Test',
    htmlContent: '<p>Test</p>',
  })

  assert.deepEqual(result, { success: false, reason: 'configuration_missing' })
  assert.equal(called, false)
})

test('returns a provider message ID and authenticates with the REST key', async () => {
  rememberEnvironment()
  configureEmail()
  let observedApiKey = ''
  globalThis.fetch = async (_input, init) => {
    observedApiKey = new Headers(init?.headers).get('api-key') ?? ''
    return Response.json({ messageId: '<provider-message-id>' })
  }

  const result = await sendTransactionalEmail({
    to: [{ email: 'member@example.test' }],
    subject: 'Test',
    htmlContent: '<p>Test</p>',
  })

  assert.deepEqual(result, { success: true, messageId: '<provider-message-id>' })
  assert.equal(observedApiKey, 'test-rest-key')
})

test('categorizes provider rejection without returning the provider body', async () => {
  rememberEnvironment()
  configureEmail()
  globalThis.fetch = async () => new Response('sensitive provider detail', { status: 429 })

  const result = await sendTransactionalEmail({
    to: [{ email: 'member@example.test' }],
    subject: 'Test',
    htmlContent: '<p>Test</p>',
  })

  assert.deepEqual(result, {
    success: false,
    reason: 'provider_rejected',
    statusCode: 429,
  })
  assert.equal(JSON.stringify(result).includes('sensitive'), false)
})

test('categorizes network and malformed success responses safely', async () => {
  rememberEnvironment()
  configureEmail()
  globalThis.fetch = async () => {
    throw new Error('sensitive network detail')
  }

  const networkResult = await sendTransactionalEmail({
    to: [{ email: 'member@example.test' }],
    subject: 'Test',
    htmlContent: '<p>Test</p>',
  })
  assert.deepEqual(networkResult, { success: false, reason: 'network_failure' })
  assert.equal(JSON.stringify(networkResult).includes('sensitive'), false)

  globalThis.fetch = async () => Response.json({ unexpected: true })
  const responseResult = await sendTransactionalEmail({
    to: [{ email: 'member@example.test' }],
    subject: 'Test',
    htmlContent: '<p>Test</p>',
  })
  assert.deepEqual(responseResult, {
    success: false,
    reason: 'unexpected_response',
    statusCode: 200,
  })
})
