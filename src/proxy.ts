import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { getSupabaseEnvironment } from '@/config/environment'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, publishableKey } = getSupabaseEnvironment()
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isAuthRoute = ['/login', '/register', '/forgot-password', '/verify-email'].includes(path)

  if (!user && path.startsWith('/dashboard')) {
    const destination = request.nextUrl.clone()
    destination.pathname = '/login'
    destination.searchParams.set('next', path)
    return NextResponse.redirect(destination)
  }
  if (user && isAuthRoute) {
    const destination = request.nextUrl.clone()
    destination.pathname = '/dashboard'
    destination.search = ''
    return NextResponse.redirect(destination)
  }
  return response
}

export const config = { matcher: ['/dashboard/:path*', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'] }
