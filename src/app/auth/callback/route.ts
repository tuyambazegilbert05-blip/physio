import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const emailOtpTypes: EmailOtpType[] = ['signup', 'email', 'recovery', 'magiclink', 'invite', 'email_change']

function safeDestination(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/dashboard'
  return value
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const destination = safeDestination(url.searchParams.get('next'))
  const supabase = await createClient()

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type && emailOtpTypes.includes(type)
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('Email callback is missing a valid one-time credential.') }

  if (error) {
    const failed = new URL('/login', request.url)
    failed.searchParams.set('message', 'That email link has expired or has already been used. Request a new one.')
    return NextResponse.redirect(failed)
  }

  return NextResponse.redirect(new URL(destination, request.url))
}
