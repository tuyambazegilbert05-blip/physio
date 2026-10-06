import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

if (process.env.NODE_ENV === 'production') throw new Error('Database reset is disabled in production.')
if (!process.argv.includes('--confirm-reset')) {
  throw new Error('This deletes local application data. Re-run with --confirm-reset after reviewing the target database URL.')
}

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) throw new Error('Set SUPABASE_DB_URL to your local Supabase PostgreSQL connection string.')
const databaseUrl = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname)) {
  throw new Error('Database reset accepts local hosts only; the target must be localhost, 127.0.0.1, or ::1.')
}

const migrationDirectory = resolve('database/migrations')
const migrationFiles = readdirSync(migrationDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{3}_/.test(entry.name))
  .sort((left, right) => left.name.localeCompare(right.name))
  .map((entry) => join(migrationDirectory, entry.name, 'migration.sql'))

if (migrationFiles.length === 0) throw new Error('No numbered database migrations were found.')
const migrationSql = migrationFiles.map((file) => readFileSync(file, 'utf8')).join('\n\n')
const resetSql = `
begin;
drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
${migrationSql}
commit;
`

const result = spawnSync('psql', [connectionString, '--set=ON_ERROR_STOP=1'], {
  encoding: 'utf8',
  input: resetSql,
  maxBuffer: 8 * 1024 * 1024,
  shell: false,
})
if (result.error) throw new Error(`Could not start psql: ${result.error.message}`)
if (result.status !== 0) throw new Error(result.stderr || 'Local database reset failed; the transaction was rolled back.')
console.log(`Reset local PostgreSQL and applied ${migrationFiles.length} numbered migrations.`)
