-- Move account identity and email ownership into Ikimina while retaining the
-- existing profile UUIDs used by memberships, financial records, and audit rows.

alter table public.profiles
  add column if not exists email text,
  add column if not exists normalized_email text,
  add column if not exists email_verified_at timestamptz,
  add column if not exists account_status text not null default 'pending_verification',
  add column if not exists password_changed_at timestamptz,
  add column if not exists last_login_at timestamptz;

-- Preserve all existing application IDs and verified state. Supabase password
-- hashes are intentionally not copied; users without an application password
-- can establish one through the app-owned recovery flow.
insert into public.profiles(id, full_name, email, normalized_email, email_verified_at, account_status)
select u.id,
       coalesce(nullif(p.full_name, ''), nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)),
       lower(btrim(u.email)), lower(btrim(u.email)),
       coalesce(v.verified_at, u.email_confirmed_at),
       case when coalesce(v.verified_at, u.email_confirmed_at) is not null then 'active' else 'pending_verification' end
from auth.users u
left join public.profiles p on p.id = u.id
left join public.account_email_verifications v on v.user_id = u.id
where u.email is not null
on conflict (id) do update set
  email = excluded.email,
  normalized_email = excluded.normalized_email,
  email_verified_at = coalesce(public.profiles.email_verified_at, excluded.email_verified_at),
  account_status = case
    when coalesce(public.profiles.email_verified_at, excluded.email_verified_at) is not null then 'active'
    else public.profiles.account_status
  end;

update public.profiles
set email = lower(btrim(email)),
    normalized_email = lower(btrim(coalesce(normalized_email, email)))
where email is not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_account_status_check') then
    alter table public.profiles add constraint profiles_account_status_check
      check (account_status in ('active', 'pending_verification', 'suspended', 'disabled'));
  end if;
end $$;

create unique index if not exists profiles_normalized_email_unique
  on public.profiles(normalized_email) where normalized_email is not null;

drop trigger if exists auth_user_profile on auth.users;
drop function if exists public.create_profile_for_auth_user();

-- User IDs continue to be the existing profiles.id values. Re-point public
-- foreign keys away from auth.users so future accounts are independent.
do $$
declare item record; definition text;
begin
  for item in
    select c.oid, c.conrelid::regclass as table_name, c.conname, pg_get_constraintdef(c.oid) as definition
    from pg_constraint c
    join pg_class ref_table on ref_table.oid = c.confrelid
    join pg_namespace ref_schema on ref_schema.oid = ref_table.relnamespace
    join pg_namespace source_schema on source_schema.oid = (select relnamespace from pg_class where oid = c.conrelid)
    where c.contype = 'f' and ref_schema.nspname = 'auth' and ref_table.relname = 'users'
      and source_schema.nspname = 'public' and c.conrelid <> 'public.profiles'::regclass
  loop
    definition := replace(item.definition, 'REFERENCES auth.users', 'REFERENCES public.profiles');
    execute format('alter table %s drop constraint %I', item.table_name, item.conname);
    execute format('alter table %s add constraint %I %s', item.table_name, item.conname, definition);
  end loop;

  for item in
    select c.conname
    from pg_constraint c
    join pg_class ref_table on ref_table.oid = c.confrelid
    join pg_namespace ref_schema on ref_schema.oid = ref_table.relnamespace
    where c.contype = 'f' and c.conrelid = 'public.profiles'::regclass
      and ref_schema.nspname = 'auth' and ref_table.relname = 'users'
  loop
    execute format('alter table public.profiles drop constraint %I', item.conname);
  end loop;
end $$;

create table if not exists public.app_password_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  password_hash text not null,
  password_changed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  mfa_verified_until timestamptz,
  revoked_at timestamptz,
  ip_address text,
  user_agent text
);
create index if not exists app_sessions_user_active_idx on public.app_sessions(user_id, expires_at) where revoked_at is null;
alter table public.app_sessions add column if not exists mfa_verified_until timestamptz;
create table if not exists public.app_password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_password_reset_tokens_active_idx on public.app_password_reset_tokens(token_hash, expires_at) where used_at is null;
create table if not exists public.app_auth_rate_limits (
  scope text not null check (char_length(scope) between 1 and 64),
  bucket_hash text not null check (bucket_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  primary key (scope, bucket_hash)
);
create table if not exists public.app_totp_factors (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  secret_ciphertext text not null,
  status text not null check (status in ('pending', 'verified')),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  last_used_step bigint
);
create table if not exists public.app_login_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz,
  remember_me boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists app_login_challenges_expiry_idx on public.app_login_challenges(expires_at) where consumed_at is null;

alter table public.app_password_credentials enable row level security;
alter table public.app_sessions enable row level security;
alter table public.app_password_reset_tokens enable row level security;
alter table public.app_auth_rate_limits enable row level security;
alter table public.app_totp_factors enable row level security;
alter table public.app_login_challenges enable row level security;
revoke all on public.app_password_credentials, public.app_sessions, public.app_password_reset_tokens, public.app_auth_rate_limits, public.app_totp_factors, public.app_login_challenges from public, anon, authenticated;
grant all on public.app_password_credentials, public.app_sessions, public.app_password_reset_tokens, public.app_auth_rate_limits, public.app_totp_factors, public.app_login_challenges to service_role;

create or replace function public.create_application_account(
  target_user uuid,
  target_email text,
  target_full_name text,
  target_password_hash text,
  target_session_hash text,
  target_session_expiry timestamptz,
  target_ip text,
  target_user_agent text,
  email_is_preverified boolean default false
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare normalized text := lower(btrim(target_email)); now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if target_user is null or target_password_hash is null or char_length(target_password_hash) > 256
     or target_session_hash is null or target_session_hash !~ '^[0-9a-f]{64}$'
     or normalized is null or char_length(normalized) not between 3 and 254
     or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     or target_full_name is null or char_length(btrim(target_full_name)) not between 2 and 120
     or target_session_expiry <= now_at then
    raise exception 'Invalid account registration';
  end if;
  insert into public.profiles(id, full_name, email, normalized_email, email_verified_at, account_status)
  values (target_user, btrim(target_full_name), normalized, normalized,
    case when email_is_preverified then now_at else null end,
    case when email_is_preverified then 'active' else 'pending_verification' end);
  insert into public.app_password_credentials(user_id, password_hash, password_changed_at)
  values (target_user, target_password_hash, now_at);
  insert into public.app_sessions(user_id, token_hash, expires_at, ip_address, user_agent)
  values (target_user, target_session_hash, target_session_expiry, left(target_ip, 64), left(target_user_agent, 512));
  if email_is_preverified then
    insert into public.account_email_verifications(user_id, verified_email, verified_at)
    values (target_user, normalized, now_at)
    on conflict (user_id) do update set verified_email = excluded.verified_email, verified_at = excluded.verified_at;
  end if;
  return target_user;
end;
$$;
revoke all on function public.create_application_account(uuid, text, text, text, text, timestamptz, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_application_account(uuid, text, text, text, text, timestamptz, text, text, boolean) to service_role;

create or replace function public.consume_app_auth_rate_limit(target_scope text, target_bucket_hash text, max_requests integer, window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare count_now integer; now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if target_scope is null or char_length(target_scope) not between 1 and 64
     or target_bucket_hash is null or target_bucket_hash !~ '^[0-9a-f]{64}$'
     or max_requests < 1 or window_seconds < 1 then raise exception 'Invalid rate-limit request'; end if;
  insert into public.app_auth_rate_limits(scope, bucket_hash, window_started_at, request_count)
  values (target_scope, target_bucket_hash, now_at, 1)
  on conflict (scope, bucket_hash) do update set
    request_count = case
      when app_auth_rate_limits.window_started_at <= now_at - make_interval(secs => window_seconds) then 1
      else least(app_auth_rate_limits.request_count + 1, max_requests + 1)
    end,
    window_started_at = case
      when app_auth_rate_limits.window_started_at <= now_at - make_interval(secs => window_seconds) then now_at
      else app_auth_rate_limits.window_started_at
    end
  returning request_count into count_now;
  delete from public.app_auth_rate_limits where window_started_at < now_at - interval '2 days';
  return count_now <= max_requests;
end;
$$;
revoke all on function public.consume_app_auth_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_app_auth_rate_limit(text, text, integer, integer) to service_role;

create or replace function public.consume_password_reset_token(target_token_hash text, target_password_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare reset_row public.app_password_reset_tokens%rowtype; now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if target_token_hash is null or target_token_hash !~ '^[0-9a-f]{64}$'
     or target_password_hash is null or char_length(target_password_hash) > 256 then return false; end if;
  select r.* into reset_row from public.app_password_reset_tokens r
  join public.profiles p on p.id = r.user_id and p.account_status in ('active','pending_verification')
  where r.token_hash = target_token_hash and r.used_at is null and r.expires_at > now_at
  for update of r;
  if reset_row.id is null then return false; end if;
  update public.app_password_reset_tokens set used_at = now_at where id = reset_row.id;
  insert into public.app_password_credentials(user_id, password_hash, password_changed_at, updated_at)
  values (reset_row.user_id, target_password_hash, now_at, now_at)
  on conflict (user_id) do update set password_hash = excluded.password_hash,
    password_changed_at = excluded.password_changed_at, updated_at = excluded.updated_at;
  update public.profiles set password_changed_at = now_at where id = reset_row.user_id;
  update public.app_sessions set revoked_at = now_at where user_id = reset_row.user_id and revoked_at is null;
  return true;
end;
$$;
revoke all on function public.consume_password_reset_token(text, text) from public, anon, authenticated;
grant execute on function public.consume_password_reset_token(text, text) to service_role;

create or replace function public.change_application_password(target_user uuid, target_session uuid, target_password_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if target_user is null or target_session is null or target_password_hash is null or char_length(target_password_hash) > 256 then return false; end if;
  if not exists(select 1 from public.app_sessions s where s.id = target_session and s.user_id = target_user and s.revoked_at is null and s.expires_at > now_at) then return false; end if;
  insert into public.app_password_credentials(user_id,password_hash,password_changed_at,updated_at)
  values(target_user,target_password_hash,now_at,now_at)
  on conflict(user_id) do update set password_hash = excluded.password_hash,password_changed_at = excluded.password_changed_at,updated_at = excluded.updated_at;
  update public.profiles set password_changed_at = now_at where id = target_user;
  update public.app_sessions set revoked_at = now_at where user_id = target_user and id <> target_session and revoked_at is null;
  return true;
end;
$$;
revoke all on function public.change_application_password(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.change_application_password(uuid, uuid, text) to service_role;

create or replace function public.fail_application_login_challenge(target_token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare challenge_id uuid;
begin
  update public.app_login_challenges set attempts = least(attempts + 1, 5),
    consumed_at = case when attempts + 1 >= 5 then now() else consumed_at end
  where token_hash = target_token_hash and consumed_at is null and expires_at > now() and attempts < 5
  returning id into challenge_id;
  return challenge_id is not null;
end;
$$;
revoke all on function public.fail_application_login_challenge(text) from public, anon, authenticated;
grant execute on function public.fail_application_login_challenge(text) to service_role;

create or replace function public.complete_application_login_challenge(
  target_token_hash text,
  target_totp_step bigint,
  target_session_hash text,
  target_session_expiry timestamptz,
  target_ip text,
  target_user_agent text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare challenge public.app_login_challenges%rowtype; now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if target_token_hash is null or target_token_hash !~ '^[0-9a-f]{64}$'
     or target_totp_step is null or target_session_hash is null or target_session_hash !~ '^[0-9a-f]{64}$'
     or target_session_expiry <= now_at then return null; end if;
  select * into challenge from public.app_login_challenges c
  where c.token_hash = target_token_hash and c.consumed_at is null and c.expires_at > now_at and c.attempts < 5
  for update;
  if challenge.id is null then return null; end if;
  if not exists(select 1 from public.profiles p where p.id = challenge.user_id and p.account_status in ('active','pending_verification')) then return null; end if;
  update public.app_totp_factors set last_used_step = target_totp_step
  where user_id = challenge.user_id and status = 'verified'
    and (last_used_step is null or last_used_step < target_totp_step);
  if not found then return null; end if;
  update public.app_login_challenges set consumed_at = now_at where id = challenge.id;
  insert into public.app_sessions(user_id, token_hash, expires_at, ip_address, user_agent, mfa_verified_until)
  values(challenge.user_id, target_session_hash, target_session_expiry, left(target_ip, 64), left(target_user_agent, 512), least(target_session_expiry, now_at + interval '12 hours'));
  update public.profiles set last_login_at = now_at where id = challenge.user_id;
  return challenge.user_id;
end;
$$;
revoke all on function public.complete_application_login_challenge(text, bigint, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.complete_application_login_challenge(text, bigint, text, timestamptz, text, text) to service_role;

create or replace function public.disable_application_totp_factor(target_user uuid, target_totp_step bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  delete from public.app_totp_factors where user_id = target_user and status = 'verified'
    and (last_used_step is null or last_used_step < target_totp_step);
  return found;
end;
$$;
revoke all on function public.disable_application_totp_factor(uuid, bigint) from public, anon, authenticated;
grant execute on function public.disable_application_totp_factor(uuid, bigint) to service_role;

create or replace function public.account_email_is_verified(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_user and p.email_verified_at is not null
      and p.account_status = 'active' and p.email is not null
      and p.normalized_email = lower(btrim(p.email))
  )
$$;
revoke all on function public.account_email_is_verified(uuid) from public, anon, authenticated;
grant execute on function public.account_email_is_verified(uuid) to service_role;

create or replace function public.current_account_email_verified()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.account_email_is_verified(auth.uid())
$$;
revoke all on function public.current_account_email_verified() from public, anon;
grant execute on function public.current_account_email_verified() to authenticated;

create or replace function public.issue_email_verification_code(target_code_hash text, target_ip_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare account_id uuid := auth.uid(); account_email text; ip_count integer; account_count integer;
  now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if account_id is null then raise exception 'Authentication required'; end if;
  if target_code_hash is null or target_ip_hash is null
     or target_code_hash !~ '^[0-9a-f]{64}$' or target_ip_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid verification request'; end if;
  select p.normalized_email into account_email from public.profiles p
  where p.id = account_id and p.account_status = 'pending_verification';
  if account_email is null or public.account_email_is_verified(account_id) then return false; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('otp-ip:' || target_ip_hash, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('otp-account:' || account_id::text, 0));
  insert into public.auth_email_otp_limits(bucket_kind, bucket_hash, window_started_at, request_count)
  values ('ip', target_ip_hash, now_at, 1)
  on conflict (bucket_kind, bucket_hash) do update set
    request_count = case when auth_email_otp_limits.window_started_at < now_at - interval '1 hour' then 1 else least(auth_email_otp_limits.request_count + 1, 11) end,
    window_started_at = case when auth_email_otp_limits.window_started_at < now_at - interval '1 hour' then now_at else auth_email_otp_limits.window_started_at end
  returning request_count into ip_count;
  if ip_count > 10 then return false; end if;
  insert into public.auth_email_otp_limits(bucket_kind, bucket_hash, window_started_at, request_count)
  values ('email', account_id::text, now_at, 1)
  on conflict (bucket_kind, bucket_hash) do update set
    request_count = case when auth_email_otp_limits.window_started_at < now_at - interval '15 minutes' then 1 else least(auth_email_otp_limits.request_count + 1, 4) end,
    window_started_at = case when auth_email_otp_limits.window_started_at < now_at - interval '15 minutes' then now_at else auth_email_otp_limits.window_started_at end
  returning request_count into account_count;
  if account_count > 3 then return false; end if;
  insert into public.email_verification_challenges(user_id, email, code_hash, expires_at, attempts, created_at)
  values (account_id, account_email, target_code_hash, now_at + interval '10 minutes', 0, now_at)
  on conflict (user_id) do update set email = excluded.email, code_hash = excluded.code_hash,
    expires_at = excluded.expires_at, attempts = 0, created_at = excluded.created_at;
  delete from public.auth_email_otp_limits where window_started_at < now_at - interval '1 day';
  return true;
end;
$$;
revoke all on function public.issue_email_verification_code(text, text) from public, anon;
grant execute on function public.issue_email_verification_code(text, text) to authenticated;

create or replace function public.verify_email_verification_code(target_email text, target_code_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare challenge public.email_verification_challenges%rowtype; requested_email text := lower(btrim(target_email));
  now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is null or requested_email is null or char_length(requested_email) not between 3 and 254
     or target_code_hash is null or target_code_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  select c.* into challenge from public.email_verification_challenges c
  join public.profiles p on p.id = c.user_id
  where c.user_id = auth.uid() and lower(c.email) = requested_email
    and p.normalized_email = requested_email and p.account_status = 'pending_verification'
  for update of c;
  if challenge.user_id is null then return false; end if;
  if challenge.expires_at <= now_at or challenge.attempts >= 5 then
    delete from public.email_verification_challenges where user_id = challenge.user_id;
    return false;
  end if;
  if challenge.code_hash is distinct from target_code_hash then
    update public.email_verification_challenges set attempts = least(attempts + 1, 5) where user_id = challenge.user_id;
    return false;
  end if;
  update public.profiles set email_verified_at = now_at, account_status = 'active' where id = challenge.user_id;
  insert into public.account_email_verifications(user_id, verified_email, verified_at)
  values (challenge.user_id, requested_email, now_at)
  on conflict (user_id) do update set verified_email = excluded.verified_email, verified_at = excluded.verified_at;
  delete from public.email_verification_challenges where user_id = challenge.user_id;
  return true;
end;
$$;
revoke all on function public.verify_email_verification_code(text, text) from public;
grant execute on function public.verify_email_verification_code(text, text) to authenticated;

create or replace function public.claim_member(target_member uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare claimed_member uuid; target_group uuid; prior_role text; current_email text;
begin
  if auth.uid() is null or not public.current_account_email_verified() then raise exception 'Verify your email before claiming an Ikimina member record'; end if;
  select p.normalized_email into current_email from public.profiles p where p.id = auth.uid();
  update public.members m set user_id = auth.uid()
  where m.id = target_member and m.user_id is null and m.status = 'active'
    and lower(btrim(m.email)) = current_email
  returning m.id, m.group_id, m.legacy_role into claimed_member, target_group, prior_role;
  if claimed_member is null then raise exception 'No unlinked active member record matches the verified account email'; end if;
  if prior_role = 'chairperson' then
    insert into public.group_role_assignments(group_id,user_id,role_key,user_email,granted_by)
    values (target_group,auth.uid(),'chairperson',current_email,auth.uid()),
      (target_group,auth.uid(),'committee_member',current_email,auth.uid()),
      (target_group,auth.uid(),'system_administrator',current_email,auth.uid()) on conflict do nothing;
  elsif prior_role in ('treasurer','secretary') then
    insert into public.group_role_assignments(group_id,user_id,role_key,user_email,granted_by)
    values (target_group,auth.uid(),prior_role,current_email,auth.uid()) on conflict do nothing;
  end if;
  update public.members set legacy_role = 'member' where id = claimed_member;
  return claimed_member;
end;
$$;

create or replace function public.assign_group_role(target_group uuid, target_email text, target_role text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_user uuid; actor_roles text[]; normalized text := lower(btrim(target_email));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_group_permission(target_group, 'roles:manage') then raise exception 'Role management permission required'; end if;
  if target_role not in ('committee_member','group_administrator','treasurer','secretary','system_administrator','technician','security_administrator','super_administrator') then raise exception 'This role cannot be assigned through standard role management'; end if;
  actor_roles := public.current_group_roles(target_group);
  if target_role = 'super_administrator' and not ('super_administrator' = any(actor_roles)) then raise exception 'Super-administrator access can only be granted by a super administrator'; end if;
  if target_role in ('system_administrator','technician','security_administrator') and not ('system_administrator' = any(actor_roles) or 'super_administrator' = any(actor_roles)) then raise exception 'Technical roles can only be assigned by a system administrator'; end if;
  select p.id into target_user from public.profiles p where p.normalized_email = normalized and public.account_email_is_verified(p.id) limit 1;
  if target_user is null then raise exception 'No verified registered account matches that email'; end if;
  if target_user = auth.uid() then raise exception 'You cannot assign roles to your own account'; end if;
  insert into public.group_role_assignments(group_id,user_id,role_key,user_email,granted_by)
  values(target_group,target_user,target_role,normalized,auth.uid()) on conflict(group_id,user_id,role_key) do nothing;
  return target_user;
end;
$$;

create or replace function public.transfer_group_chairperson(target_group uuid, target_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_user uuid; former_chairs uuid[]; actor_roles text[]; normalized text := lower(btrim(target_email));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_group_role(target_group,'chairperson') or not public.has_group_permission(target_group,'roles:manage') then raise exception 'Only the current chairperson can transfer this role'; end if;
  select p.id into target_user from public.profiles p where p.normalized_email = normalized and public.account_email_is_verified(p.id) limit 1;
  if target_user is null then raise exception 'No verified registered account matches that email'; end if;
  if target_user = auth.uid() then raise exception 'Choose another active member to transfer the chairperson role'; end if;
  if not exists(select 1 from public.members m where m.group_id = target_group and m.user_id = target_user and m.status = 'active') then raise exception 'The new chairperson must be an active Ikimina Member'; end if;
  select coalesce(array_agg(a.user_id),'{}'::uuid[]) into former_chairs from public.group_role_assignments a where a.group_id = target_group and a.role_key = 'chairperson';
  actor_roles := public.current_group_roles(target_group);
  insert into public.audit_logs(group_id,actor_id,action,entity,entity_id,permission_used,authority_roles,before_data,after_data)
  values(target_group,auth.uid(),'transfer','chairperson_role',target_user::text,'roles:manage',actor_roles,jsonb_build_object('previous_chairpersons',former_chairs),jsonb_build_object('new_chairperson',target_user));
  delete from public.group_role_assignments where group_id = target_group and role_key = 'chairperson';
  delete from public.group_role_assignments where group_id = target_group and role_key in ('committee_member','system_administrator') and user_id = any(former_chairs);
  insert into public.group_role_assignments(group_id,user_id,role_key,user_email,granted_by)
  select target_group,target_user,role_key,normalized,auth.uid() from (values('chairperson'),('committee_member'),('system_administrator')) roles(role_key)
  on conflict(group_id,user_id,role_key) do nothing;
  return target_user;
end;
$$;

create or replace function public.create_group(group_name text, contribution numeric, frequency text, currency_code text, group_description text, group_location text, is_discoverable boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_group_id uuid; account public.profiles%rowtype;
begin
  if auth.uid() is null or not public.current_account_email_verified() then raise exception 'Verify your email before creating an Ikimina'; end if;
  select * into account from public.profiles where id = auth.uid();
  insert into public.groups(name,description,location,discoverable,contribution_amount,contribution_frequency,currency,created_by)
  values(group_name,coalesce(group_description,''),nullif(btrim(group_location),''),coalesce(is_discoverable,true),contribution,frequency,upper(currency_code),auth.uid()) returning id into new_group_id;
  insert into public.members(group_id,user_id,full_name,email,legacy_role) values(new_group_id,account.id,account.full_name,account.email,'member');
  insert into public.group_role_assignments(group_id,user_id,role_key,user_email,granted_by)
  values(new_group_id,account.id,'chairperson',account.normalized_email,account.id);
  return new_group_id;
end;
$$;

create or replace function public.request_group_join(target_group uuid, request_message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_id uuid; account public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into account from public.profiles p where p.id = auth.uid() and public.account_email_is_verified(p.id);
  if account.id is null then raise exception 'Verify your email before requesting membership'; end if;
  if request_message is not null and char_length(btrim(request_message)) > 1000 then raise exception 'The request message is too long'; end if;
  if not exists(select 1 from public.groups g where g.id = target_group and g.discoverable) then raise exception 'This Ikimina is not available for joining'; end if;
  if public.is_group_member(target_group) then raise exception 'You are already an active member'; end if;
  select r.id into request_id from public.join_requests r where r.group_id = target_group and r.user_id = auth.uid() and r.status = 'pending' order by r.created_at desc limit 1;
  if request_id is not null then return request_id; end if;
  insert into public.join_requests(group_id,user_id,message,applicant_name,applicant_email)
  values(target_group,auth.uid(),nullif(btrim(request_message),''),account.full_name,account.normalized_email)
  on conflict(group_id,user_id) where status = 'pending' do nothing returning id into request_id;
  if request_id is null then select r.id into request_id from public.join_requests r where r.group_id = target_group and r.user_id = auth.uid() and r.status = 'pending' order by r.created_at desc limit 1; end if;
  return request_id;
end;
$$;

create or replace function public.review_group_join_request(target_request uuid, decision text, applicant_message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_row public.join_requests%rowtype; account public.profiles%rowtype; matched_member uuid; member_row public.members%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
  if applicant_message is not null and char_length(btrim(applicant_message)) > 1000 then raise exception 'The member message is too long'; end if;
  select * into request_row from public.join_requests where id = target_request for update;
  if request_row.id is null then raise exception 'Membership request was not found'; end if;
  if not public.has_group_permission(request_row.group_id,'membership:requests_review') then raise exception 'Membership request review permission required'; end if;
  if request_row.status <> 'pending' then raise exception 'This request has already been reviewed'; end if;
  if decision = 'approved' then
    select * into account from public.profiles p where p.id = request_row.user_id and public.account_email_is_verified(p.id);
    if account.id is null then raise exception 'The applicant account is not email verified'; end if;
    select m.id into matched_member from public.members m where m.group_id = request_row.group_id and m.user_id = request_row.user_id for update;
    if matched_member is null then
      select m.id,m.user_id into member_row.id,member_row.user_id from public.members m where m.group_id = request_row.group_id and lower(btrim(m.email)) = account.normalized_email for update;
      if member_row.id is not null and member_row.user_id is not null and member_row.user_id <> request_row.user_id then raise exception 'A different account is already linked to this member record'; end if;
      if member_row.id is not null then
        update public.members set user_id = request_row.user_id,full_name = account.full_name,email = account.email,status = 'active' where id = member_row.id returning id into matched_member;
      else
        insert into public.members(group_id,user_id,full_name,email,status) values(request_row.group_id,request_row.user_id,account.full_name,account.email,'active') returning id into matched_member;
      end if;
    else update public.members set status = 'active' where id = matched_member;
    end if;
  end if;
  update public.join_requests set status = decision,reviewed_by = auth.uid(),reviewed_at = now(),decision_message = nullif(btrim(applicant_message),'') where id = target_request;
  return matched_member;
end;
$$;

create or replace function public.accept_group_invitation(target_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare invite public.group_invitations%rowtype; account public.profiles%rowtype; group_name text; member_row public.members%rowtype; new_member_id uuid; now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_token_hash is null or target_token_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('status','invalid'); end if;
  select * into invite from public.group_invitations where token_hash = target_token_hash for update;
  if invite.id is null then return jsonb_build_object('status','invalid'); end if;
  if invite.status = 'accepted' then
    if invite.invitee_user_id = auth.uid() then return jsonb_build_object('status','accepted','group_id',invite.group_id); end if;
    return jsonb_build_object('status','invalid');
  end if;
  if invite.status = 'declined' then return jsonb_build_object('status','declined'); end if;
  if invite.status = 'revoked' then return jsonb_build_object('status','revoked'); end if;
  if invite.status = 'expired' or invite.expires_at <= now_at then
    if invite.status <> 'expired' then update public.group_invitations set status = 'expired' where id = invite.id; end if;
    return jsonb_build_object('status','expired');
  end if;
  if invite.status not in ('pending','sent','delivery_failed') then return jsonb_build_object('status','invalid'); end if;
  select * into account from public.profiles p where p.id = auth.uid() and p.account_status in ('active','pending_verification');
  if account.id is null then return jsonb_build_object('status','account_unverified'); end if;
  if account.normalized_email <> invite.email then return jsonb_build_object('status','email_mismatch'); end if;
  select g.name into group_name from public.groups g where g.id = invite.group_id for update;
  if group_name is null or exists(select 1 from public.group_system_controls c where c.group_id = invite.group_id and c.status in ('locked','maintenance')) then
    update public.group_invitations set status = 'revoked',revoked_at = now_at where id = invite.id;
    return jsonb_build_object('status','unavailable');
  end if;
  select * into member_row from public.members m where m.group_id = invite.group_id and m.user_id = auth.uid() for update;
  if member_row.id is null then select * into member_row from public.members m where m.group_id = invite.group_id and lower(btrim(coalesce(m.email,''))) = invite.email for update; end if;
  if member_row.id is not null then
    if member_row.status <> 'active' or (member_row.user_id is not null and member_row.user_id <> auth.uid()) then return jsonb_build_object('status','membership_blocked'); end if;
    if member_row.user_id is null then update public.members set user_id = auth.uid(),full_name = account.full_name,email = account.email where id = member_row.id returning id into new_member_id;
    else new_member_id := member_row.id; end if;
  else
    insert into public.members(group_id,user_id,full_name,email,status) values(invite.group_id,auth.uid(),account.full_name,account.email,'active') returning id into new_member_id;
  end if;
  update public.profiles set email_verified_at = coalesce(email_verified_at,now_at),account_status = 'active' where id = auth.uid();
  insert into public.account_email_verifications(user_id,verified_email,verified_at) values(auth.uid(),account.normalized_email,coalesce(account.email_verified_at,now_at))
    on conflict(user_id) do update set verified_email = excluded.verified_email,verified_at = excluded.verified_at;
  update public.join_requests set status = 'superseded',reviewed_by = invite.invited_by,reviewed_at = now_at,decision_message = 'Superseded by an accepted group invitation.' where group_id = invite.group_id and user_id = auth.uid() and status = 'pending';
  update public.group_invitations set status = 'accepted',accepted_at = now_at,accepted_by = auth.uid(),invitee_user_id = auth.uid() where id = invite.id;
  return jsonb_build_object('status','accepted','group_id',invite.group_id,'group_name',group_name,'member_id',new_member_id);
end;
$$;

create or replace function public.create_group_invitation(target_group uuid, target_email text, target_token_hash text, target_invitee_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); invitee_email text := lower(btrim(target_email)); invitation_id uuid;
  now_at timestamptz := pg_catalog.clock_timestamp(); recent_invites integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not public.current_account_email_verified() then raise exception 'A verified account is required'; end if;
  if not public.has_group_permission(target_group,'members:invite') then raise exception 'Invitation permission required'; end if;
  if invitee_email is null or char_length(invitee_email) not between 3 and 254
     or invitee_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Enter a valid invitation email'; end if;
  if target_token_hash is null or target_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation token'; end if;
  if target_invitee_name is not null and char_length(btrim(target_invitee_name)) not between 2 and 120 then raise exception 'Invitee name must be between 2 and 120 characters'; end if;
  if not exists(select 1 from public.groups g where g.id = target_group) then raise exception 'Group not found'; end if;
  if exists(select 1 from public.group_system_controls c where c.group_id = target_group and c.status in ('locked','maintenance')) then raise exception 'This group is not accepting invitations'; end if;
  if exists(
    select 1 from public.members m left join public.profiles p on p.id = m.user_id
    where m.group_id = target_group and m.status = 'active'
      and (lower(btrim(coalesce(m.email,''))) = invitee_email or p.normalized_email = invitee_email)
  ) then raise exception 'This person is already a member of the group'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('group-invite:' || target_group::text || ':' || invitee_email,0));
  select count(*) into recent_invites from public.group_invitations i where i.invited_by = actor_id and i.created_at > now_at - interval '1 hour';
  if recent_invites >= 20 then raise exception 'Invitation rate limit reached'; end if;
  select count(*) into recent_invites from public.group_invitations i where i.group_id = target_group and i.email = invitee_email and i.created_at > now_at - interval '24 hours';
  if recent_invites >= 3 then raise exception 'This email has already been invited recently'; end if;
  insert into public.group_invitations(group_id,email,token_hash,invited_by,expires_at,invitee_name)
  values(target_group,invitee_email,target_token_hash,actor_id,public.group_invitation_expiration(now_at),nullif(btrim(target_invitee_name),''))
  returning id into invitation_id;
  return invitation_id;
end;
$$;

create or replace function public.notify_group_invitation_lifecycle()
returns trigger language plpgsql security definer set search_path = '' as $$
declare group_name text; invitee_name text;
begin
  if tg_op <> 'UPDATE' or old.status is not distinct from new.status then return new; end if;
  if new.status not in ('accepted','declined','expired','revoked','delivery_failed') then return new; end if;
  select g.name into group_name from public.groups g where g.id = new.group_id;
  if group_name is null then return new; end if;
  select nullif(p.full_name,'') into invitee_name from public.profiles p where p.id = new.invitee_user_id;
  insert into public.notifications(user_id,title,body,href)
  values(new.invited_by,
    case new.status when 'accepted' then 'Group invitation accepted' when 'declined' then 'Group invitation declined' when 'expired' then 'Group invitation expired' when 'revoked' then 'Group invitation revoked' else 'Invitation email could not be delivered' end,
    case new.status when 'accepted' then coalesce(invitee_name,new.email) || ' accepted your invitation to join ' || group_name || '.' when 'declined' then new.email || ' declined your invitation to join ' || group_name || '.' when 'expired' then 'An invitation to ' || new.email || ' for ' || group_name || ' expired.' when 'revoked' then 'An invitation to ' || new.email || ' for ' || group_name || ' was revoked.' else 'The invitation email to ' || new.email || ' could not be delivered. You can resend it from the Invitations page.' end,
    '/dashboard/invitations?group=' || new.group_id::text);
  return new;
end;
$$;

drop policy if exists invitations_read on public.group_invitations;
create policy invitations_read on public.group_invitations for select to authenticated
using (public.has_group_permission(group_id, 'members:invite') or email = (select p.normalized_email from public.profiles p where p.id = auth.uid()));

comment on table public.app_password_credentials is 'Private application password hashes; never readable by browser or authenticated PostgREST clients.';
comment on table public.app_sessions is 'Opaque app sessions stored by token hash; never exposed to browser database clients.';
comment on table public.app_password_reset_tokens is 'Single-use application password-reset hashes; raw tokens are delivered only through email.';
comment on table public.app_totp_factors is 'Application-owned TOTP factors encrypted at rest; service role access only.';
comment on table public.app_login_challenges is 'Short-lived, single-use application MFA challenges.';
