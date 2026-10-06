const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
const missing = required.filter((name) => !process.env[name])
const [major = 0, minor = 0] = process.versions.node.split('.').map(Number)

if (major < 22 || (major === 22 && minor < 13)) {
  console.error('Physio Fund Cycle development scripts require Node.js 22.13 or newer.')
  process.exitCode = 1
} else if (missing.length) {
  console.error(`Set these values in .env.local before starting the app: ${missing.join(', ')}`)
  process.exitCode = 1
} else {
  console.log('Environment contains the required Supabase URL and publishable key.')
  console.log('Apply database/migrations/ in numeric order, then run pnpm dev.')
}
