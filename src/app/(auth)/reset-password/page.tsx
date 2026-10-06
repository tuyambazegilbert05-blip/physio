import { ResetPasswordView } from '@/components/auth/ResetPasswordView'

export const metadata = { referrer: 'no-referrer' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const params = await searchParams
  const resetToken = Array.isArray(params.token) ? params.token[0] ?? '' : params.token ?? ''
  return <ResetPasswordView resetToken={resetToken} />
}
