import { createApplicationDatabaseClient, getCurrentApplicationUser } from '@/lib/security/application-session'

/** Server-only database client bound to the user resolved from the opaque app session. */
export async function createClient() {
  const user = await getCurrentApplicationUser()
  return createApplicationDatabaseClient(user)
}
