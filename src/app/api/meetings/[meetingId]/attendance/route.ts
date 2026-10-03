import { z } from 'zod'
import { databaseError, readJson, requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

const attendanceSchema = z.object({ member_id: uuidSchema, present: z.boolean() })

export async function GET(_request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const auth = await requireApiUser()
  if (auth.response) return auth.response
  const { meetingId } = await params
  if (!uuidSchema.safeParse(meetingId).success) return Response.json({ error: { message: 'A valid meeting ID is required.' } }, { status: 400 })
  const { data: meeting, error: meetingError } = await auth.supabase.from('meetings').select('id,group_id').eq('id', meetingId).maybeSingle()
  if (meetingError) return databaseError(meetingError)
  if (!meeting) return Response.json({ error: { message: 'The requested meeting was not found.' } }, { status: 404 })

  const [{ data: members, error: membersError }, { data: attendance, error: attendanceError }] = await Promise.all([
    auth.supabase.from('members').select('id,full_name,status').eq('group_id', meeting.group_id).order('full_name'),
    auth.supabase.from('attendance').select('*').eq('meeting_id', meetingId),
  ])
  if (membersError) return databaseError(membersError)
  if (attendanceError) return databaseError(attendanceError)
  return Response.json({ data: { members: members ?? [], attendance: attendance ?? [] } })
}

export async function POST(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const auth = await requireApiUser({ requireMfaIfEnabled: true })
  if (auth.response) return auth.response
  const { meetingId } = await params
  if (!uuidSchema.safeParse(meetingId).success) return Response.json({ error: { message: 'A valid meeting ID is required.' } }, { status: 400 })
  const parsed = await readJson(request, attendanceSchema)
  if (parsed.response) return parsed.response

  const { data: meeting, error: meetingError } = await auth.supabase.from('meetings').select('id,group_id').eq('id', meetingId).maybeSingle()
  if (meetingError) return databaseError(meetingError)
  if (!meeting) return Response.json({ error: { message: 'The requested meeting was not found.' } }, { status: 404 })
  const { data: member, error: memberError } = await auth.supabase.from('members').select('id').eq('id', parsed.data.member_id).eq('group_id', meeting.group_id).maybeSingle()
  if (memberError) return databaseError(memberError)
  if (!member) return Response.json({ error: { message: 'That member does not belong to this group.' } }, { status: 422 })

  const { data, error } = await auth.supabase.from('attendance').upsert({
    meeting_id: meetingId,
    member_id: member.id,
    present: parsed.data.present,
    recorded_by: auth.user!.id,
    recorded_at: new Date().toISOString(),
  }, { onConflict: 'meeting_id,member_id' }).select().single()
  if (error) return databaseError(error)
  return Response.json({ data })
}
