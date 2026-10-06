import { redirect } from 'next/navigation'
import { getCurrentApplicationUser } from '@/lib/security/application-session'

export async function getCurrentUser() {
  return getCurrentApplicationUser()
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}
