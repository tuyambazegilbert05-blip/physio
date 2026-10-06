import { NextResponse, type NextRequest } from 'next/server'

/** Old hosted-auth callbacks are no longer an authentication path. */
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next')
  if (next === '/reset-password') {
    return NextResponse.redirect(new URL('/forgot-password?message=request-new-link', request.url))
  }
  return NextResponse.redirect(new URL('/login?message=That-link-is-no-longer-valid.-Request-a-new-one.', request.url))
}
