'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getSupabaseEnvironment } from '@/config/environment'

let client: SupabaseClient<Database> | undefined

export function createClient() {
  if (!client) {
    const { url, publishableKey } = getSupabaseEnvironment()
    client = createBrowserClient<Database>(url, publishableKey)
  }
  return client
}
