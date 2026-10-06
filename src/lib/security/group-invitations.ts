import { createAdminClient } from '@/lib/supabase/admin'
import { hashGroupInvitationToken } from '@/lib/security/group-invitation-token'

export type PublicGroupInvitation = {
  id: string
  status: 'pending' | 'sent' | 'delivery_failed' | 'accepted' | 'declined' | 'expired' | 'revoked' | 'unavailable' | 'invalid'
  email?: string
  invitee_name?: string | null
  expires_at?: string
  group_id?: string
  group_name?: string | null
  inviter_name?: string | null
  group_available?: boolean
}

export async function getPublicGroupInvitation(token: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_group_invitation_status', {
    target_token_hash: hashGroupInvitationToken(token),
  })
  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { status: 'invalid' } as PublicGroupInvitation
  return data as PublicGroupInvitation
}

export function invitationSiteUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (configuredUrl) {
    try {
      const configured = new URL(configuredUrl)
      if (process.env.NODE_ENV === 'production' && configured.protocol !== 'https:') return null
      return configured.origin
    } catch {
      return null
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    try { return new URL(request.url).origin } catch { return null }
  }
  return null
}
