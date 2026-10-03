import { createClient } from '@/lib/supabase/server'

export async function getDatabaseClient() {
  return createClient()
}
