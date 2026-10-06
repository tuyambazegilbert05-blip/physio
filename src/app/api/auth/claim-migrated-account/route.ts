import { claimAccountSchema } from '@/features/auth/schemas/auth.schema'
import { readJson, requireApiUser } from '@/lib/supabase/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashPassword } from '@/lib/security/password-hash'
import { hashEmailVerificationCode } from '@/lib/security/email-verification-otp'
import { normalizeEmail } from '@/lib/security/email-normalization'
import { logApplicationAuthEvent } from '@/lib/security/application-session'

export async function GET() {
  const auth = await requireApiUser({ requireVerifiedEmail: false })
  if (auth.response) return auth.response

  const admin = createAdminClient()
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('full_name, email, phone, legacy_member_id, is_migrated, temporary_migration_email, must_change_password')
    .eq('id', auth.user!.id)
    .single()

  if (profErr || !profile) {
    return Response.json({ error: { message: 'Profile not found.' } }, { status: 404 })
  }

  // Get member's group info
  const { data: member } = await admin
    .from('members')
    .select('group_id, groups(id, name)')
    .eq('user_id', auth.user!.id)
    .maybeSingle()

  const groupData = member?.groups as { id?: string; name?: string } | null

  return Response.json({
    data: {
      fullName: profile.full_name,
      temporaryEmail: profile.email,
      phone: profile.phone,
      legacyId: profile.legacy_member_id,
      groupId: groupData?.id ?? null,
      groupName: groupData?.name ?? 'Physio Fund Circle',
    },
  })
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: false })
  if (auth.response) return auth.response

  const parsed = await readJson(request, claimAccountSchema)
  if (parsed.response) return parsed.response

  const { fullName, newEmail, newPhone, newPassword, avatarUrl, code } = parsed.data
  const normalized = normalizeEmail(newEmail)

  // 1. Verify OTP code against the new email address
  const codeHash = hashEmailVerificationCode(normalized, code)
  const { data: verified, error: verifyErr } = await auth.supabase.rpc(
    'verify_account_claim_code',
    {
      target_new_email: normalized,
      target_code_hash: codeHash,
    },
  )

  if (verifyErr) {
    console.error('[Account Claim] verify_account_claim_code failed:', verifyErr.message)
    return Response.json(
      { error: { message: 'Verification check failed. Please try again.' } },
      { status: 500 },
    )
  }

  if (!verified) {
    return Response.json(
      { error: { message: 'The 6-digit verification code is invalid or has expired.' } },
      { status: 422 },
    )
  }

  // 2. Hash the permanent new password
  const newPasswordHash = await hashPassword(newPassword)

  // 3. Complete the account claim in database
  const admin = createAdminClient()
  const { data: result, error: claimErr } = await admin.rpc('complete_migrated_account_claim', {
    target_user: auth.user!.id,
    new_email: normalized,
    new_phone: newPhone,
    new_password_hash: newPasswordHash,
    new_full_name: fullName,
    new_avatar_url: avatarUrl || null,
  })

  if (claimErr) {
    console.error('[Account Claim] complete_migrated_account_claim failed:', claimErr.message)
    return Response.json(
      { error: { message: claimErr.message || 'Could not complete account claim.' } },
      { status: 500 },
    )
  }

  await logApplicationAuthEvent('ACCOUNT_CLAIMED', auth.user!.id, {
    new_email: normalized,
    user_id: auth.user!.id,
  })

  return Response.json({
    data: {
      success: true,
      message: 'Account successfully activated! You now have permanent access to your group.',
      profile: result,
    },
  })
}
