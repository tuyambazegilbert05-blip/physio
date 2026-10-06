export type UserProfile = {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  email: string | null
  normalized_email: string | null
  email_verified_at: string | null
  account_status: 'active' | 'pending_verification' | 'suspended' | 'disabled'
  password_changed_at: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
  is_migrated?: boolean
  migration_source?: string | null
  legacy_member_id?: string | null
  must_change_password?: boolean
  temporary_migration_email?: boolean
  legacy_phone?: string | null
}
