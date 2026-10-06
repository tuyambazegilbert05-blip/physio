import { z } from 'zod'
import { getPublicGroupInvitation } from '@/lib/security/group-invitations'
import { readJson } from '@/lib/supabase/route'

const schema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })

export async function POST(request: Request) {
  const parsed = await readJson(request, schema)
  if (parsed.response) return parsed.response
  try {
    const invitation = await getPublicGroupInvitation(parsed.data.token)
    return Response.json({ data: invitation }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
  } catch (error) {
    console.warn('[Invitations] Public invitation status could not be loaded.', {
      reason: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json({ error: { message: 'Invitation status is temporarily unavailable.' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
