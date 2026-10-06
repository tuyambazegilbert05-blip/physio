'use client'

import { useEffect, useState } from 'react'

export type ClientApplicationUser = {
  id: string
  email: string
  user_metadata: { full_name: string }
}

export function useAuth() {
  const [user, setUser] = useState<ClientApplicationUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' })
        const result = await response.json() as { data?: { user: ClientApplicationUser | null } }
        if (active) setUser(response.ok ? result.data?.user ?? null : null)
      } catch {
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    void refresh()
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    window.addEventListener('ikimina:auth-changed', onFocus)
    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('ikimina:auth-changed', onFocus)
    }
  }, [])

  return { user, loading, authenticated: Boolean(user) }
}
