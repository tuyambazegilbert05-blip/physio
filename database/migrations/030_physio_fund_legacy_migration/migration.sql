-- 030_physio_fund_legacy_migration/migration.sql
-- Staging infrastructure, idempotency tracking keys, and account claim procedures for Physio Fund Circle migration.

create table if not exists public.migration_runs (
  id uuid primary key default gen_random_uuid(),
  migration_name text not null,
  source_file text not null,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  counts jsonb default '{}'::jsonb,
  warnings jsonb default '[]'::jsonb,
  errors jsonb default '[]'::jsonb,
  reconciliation jsonb default '{}'::jsonb,
  initiated_by uuid references public.profiles(id),
  started_at timestamptz default clock_timestamp(),
  completed_at timestamptz
);

alter table public.migration_runs enable row level security;
revoke all on public.migration_runs from public, anon;
grant select on public.migration_runs to authenticated;
grant all on public.migration_runs to service_role;

-- 1. Profiles migration tracking
alter table public.profiles
  add column if not exists is_migrated boolean default false,
  add column if not exists migration_source text default null,
  add column if not exists legacy_member_id text default null,
  add column if not exists must_change_password boolean default false,
  add column if not exists temporary_migration_email boolean default false,
  add column if not exists legacy_phone text default null;

-- 2. Members legacy key
alter table public.members
  add column if not exists legacy_source text default null,
  add column if not exists legacy_member_key text default null;

-- 3. Financial tables legacy keys
alter table public.contributions
  add column if not exists legacy_source text default null,
  add column if not exists legacy_record_key text default null;

alter table public.loans
  add column if not exists legacy_source text default null,
  add column if not exists legacy_record_key text default null;

alter table public.share_transactions
  add column if not exists legacy_source text default null,
  add column if not exists legacy_record_key text default null;

alter table public.loan_repayments
  add column if not exists legacy_source text default null,
  add column if not exists legacy_record_key text default null;

-- 4. Unique idempotency indexes
create unique index if not exists idx_members_legacy_source_key
  on public.members(group_id, legacy_member_key)
  where legacy_member_key is not null;

create unique index if not exists idx_contributions_legacy_record_key
  on public.contributions(group_id, legacy_record_key)
  where legacy_record_key is not null;

create unique index if not exists idx_loans_legacy_record_key
  on public.loans(group_id, legacy_record_key)
  where legacy_record_key is not null;

create unique index if not exists idx_share_trans_legacy_record_key
  on public.share_transactions(group_id, legacy_record_key)
  where legacy_record_key is not null;

-- 5. Stored Procedure: Complete Migrated Account Claim
create or replace function public.complete_migrated_account_claim(
  target_user uuid,
  new_email text,
  new_phone text,
  new_password_hash text,
  new_full_name text default null,
  new_avatar_url text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  norm_email text := lower(btrim(new_email));
  now_at timestamptz := pg_catalog.clock_timestamp();
  profile_rec public.profiles%rowtype;
begin
  if target_user is null or norm_email is null or char_length(norm_email) < 3 then
    raise exception 'Invalid claim parameters';
  end if;

  select * into profile_rec from public.profiles where id = target_user;
  if profile_rec.id is null then
    raise exception 'User profile not found';
  end if;

  -- Ensure new email is not taken by another user
  if exists (select 1 from public.profiles where normalized_email = norm_email and id <> target_user) then
    raise exception 'An account already exists with this email address';
  end if;

  -- Update profiles
  update public.profiles set
    full_name = coalesce(nullif(btrim(new_full_name), ''), full_name),
    email = norm_email,
    normalized_email = norm_email,
    phone = coalesce(nullif(btrim(new_phone), ''), phone),
    avatar_url = coalesce(new_avatar_url, avatar_url),
    email_verified_at = now_at,
    account_status = 'active',
    is_migrated = false,
    temporary_migration_email = false,
    must_change_password = false,
    password_changed_at = now_at,
    updated_at = now_at
  where id = target_user;

  -- Update password credentials
  if new_password_hash is not null and char_length(new_password_hash) > 10 then
    insert into public.app_password_credentials(user_id, password_hash, password_changed_at, updated_at)
    values (target_user, new_password_hash, now_at, now_at)
    on conflict (user_id) do update set
      password_hash = excluded.password_hash,
      password_changed_at = excluded.password_changed_at,
      updated_at = excluded.updated_at;
  end if;

  -- Update member records for this user
  update public.members set
    email = norm_email,
    full_name = coalesce(nullif(btrim(new_full_name), ''), full_name)
  where user_id = target_user;

  -- Update role assignments email
  update public.group_role_assignments set
    user_email = norm_email
  where user_id = target_user;

  -- Log audit record
  insert into public.audit_logs(
    actor_id, action, entity, entity_id, details
  )
  values (
    target_user, 'account_claim_completed', 'profiles', target_user::text,
    jsonb_build_object(
      'previous_email', profile_rec.email,
      'new_email', norm_email,
      'legacy_member_id', profile_rec.legacy_member_id
    )
  );

  return jsonb_build_object(
    'user_id', target_user,
    'email', norm_email,
    'full_name', coalesce(nullif(btrim(new_full_name), ''), profile_rec.full_name),
    'status', 'active'
  );
end;
$$;

revoke all on function public.complete_migrated_account_claim(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.complete_migrated_account_claim(uuid, text, text, text, text, text) to authenticated, service_role;
