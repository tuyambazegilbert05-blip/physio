import { NextResponse, type NextRequest } from 'next/server'

/**
 * The proxy performs only an inexpensive missing-cookie redirect. The opaque
 * cookie is never treated as proof of identity here: protected layouts and
 * APIs validate its hash, expiry, and revocation state against the database.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (path.startsWith('/dashboard') && !request.cookies.has('ikimina_session')) {
    const destination = request.nextUrl.clone()
    destination.pathname = '/login'
    destination.searchParams.set('next', path)
    return NextResponse.redirect(destination)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }
