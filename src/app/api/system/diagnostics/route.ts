import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { canViewTechnicalDiagnostics } from '@/lib/group-workspace-access'
import { requireApiUser } from '@/lib/supabase/route'
import { uuidSchema } from '@/lib/validations'

function safeUnavailableResponse() {
  return Response.json(
    { error: { message: 'Technical diagnostics are temporarily unavailable.' } },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  )
}

async function timedProbe<T>(
  probe: () => PromiseLike<{ data: T | null; error: { code?: string } | null }>,
) {
  const started = performance.now()
  try {
    const result = await probe()
    return {
      ok: result.error === null && result.data !== null,
      durationMs: Math.round(performance.now() - started),
      data: result.error === null ? result.data : null,
    }
  } catch {
    return { ok: false, durationMs: Math.round(performance.now() - started), data: null }
  }
}

export async function GET(request: Request) {
  const auth = await requireApiUser({ requireVerifiedEmail: true })
  if (auth.response) return auth.response

  const groupId = new URL(request.url).searchParams.get('group_id')
  if (!uuidSchema.safeParse(groupId).success) {
    return Response.json(
      { error: { message: 'A valid group is required.' } },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const { data: permissions, error: permissionsError } = await auth.supabase.rpc(
    'current_group_permissions',
    { target_group: groupId! },
  )
  if (permissionsError) return safeUnavailableResponse()
  if (!canViewTechnicalDiagnostics(permissions)) {
    return Response.json(
      { error: { message: 'You do not have access to technical diagnostics for this group.' } },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const db = auth.supabase as SupabaseClient<Database>
  const [groupProbe, controlsProbe] = await Promise.all([
    timedProbe<{ id: string; name: string }>(() =>
      db.from('groups').select('id,name').eq('id', groupId!).maybeSingle(),
    ),
    timedProbe<{
      status: 'normal' | 'limited' | 'maintenance' | 'locked'
      disabled_modules: string[]
      updated_at: string | null
    }>(() =>
      db
        .from('group_system_controls')
        .select('status,disabled_modules,updated_at')
        .eq('group_id', groupId!)
        .maybeSingle()
        .then(({ data, error }) => ({
          data: data ?? { status: 'normal' as const, disabled_modules: [], updated_at: null },
          error,
        })),
    ),
  ])

  return Response.json(
    {
      data: {
        checkedAt: new Date().toISOString(),
        group:
          groupProbe.data && groupProbe.ok
            ? { id: groupProbe.data.id, name: groupProbe.data.name }
            : null,
        checks: [
          {
            key: 'group_database_read',
            label: 'Group data access',
            ok: groupProbe.ok,
            durationMs: groupProbe.durationMs,
          },
          {
            key: 'system_controls_read',
            label: 'Operational controls access',
            ok: controlsProbe.ok,
            durationMs: controlsProbe.durationMs,
          },
        ],
        controls:
          controlsProbe.data && controlsProbe.ok
            ? {
                status: controlsProbe.data.status,
                disabledModules: controlsProbe.data.disabled_modules,
                updatedAt: controlsProbe.data.updated_at,
              }
            : null,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
