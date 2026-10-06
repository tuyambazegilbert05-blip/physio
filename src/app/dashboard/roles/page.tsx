import { RoleAccessPage } from '@/features/roles/components/RoleAccessPage'

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>
}) {
  const { group } = await searchParams
  return <RoleAccessPage preferredGroupId={group} />
}
