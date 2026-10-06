-- Registration, verified group discovery, and separately approved membership.

alter table public.groups
  add column if not exists description text not null default ''
    check (char_length(description) <= 2000),
  add column if not exists location text
    check (location is null or char_length(location) <= 160),
  add column if not exists discoverable boolean not null default true;

alter table public.join_requests
  add column if not exists decision_message text
    check (decision_message is null or char_length(decision_message) <= 1000),
  add column if not exists applicant_name text,
  add column if not exists applicant_email text;

update public.join_requests r
set applicant_name = coalesce(p.full_name, split_part(u.email, '@', 1)),
    applicant_email = u.email
from auth.users u
left join public.profiles p on p.id = u.id
where r.user_id = u.id and (r.applicant_name is null or r.applicant_email is null);

-- The application owns email verification. Supabase Auth only establishes the
-- password account/session; it does not issue or validate these codes.
create table public.account_email_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_email text not null,
  verified_at timestamptz not null default now()
);
alter table public.account_email_verifications enable row level security;
revoke all on public.account_email_verifications from public, anon, authenticated, service_role;

create table public.email_verification_challenges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  created_at timestamptz not null default now()
);
alter table public.email_verification_challenges enable row level security;
revoke all on public.email_verification_challenges from public, anon, authenticated, service_role;

create table public.auth_email_otp_limits (
  bucket_kind text not null check (bucket_kind in ('email', 'ip')),
  bucket_hash text not null check (char_length(bucket_hash) between 1 and 64),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (bucket_kind, bucket_hash)
);
alter table public.auth_email_otp_limits enable row level security;
revoke all on public.auth_email_otp_limits from public, anon, authenticated, service_role;

create or replace function public.account_email_is_verified(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.account_email_verifications v
    join auth.users u on u.id = v.user_id
    where v.user_id = target_user and lower(v.verified_email) = lower(u.email)
  )
$$;
revoke all on function public.account_email_is_verified(uuid) from public, anon, authenticated;

create or replace function public.current_account_email_verified()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.account_email_is_verified(auth.uid())
$$;
revoke all on function public.current_account_email_verified() from public, anon;
grant execute on function public.current_account_email_verified() to authenticated;

create or replace function public.issue_email_verification_code(target_code_hash text, target_ip_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  account_email text;
  account_hash text;
  ip_count integer;
  account_count integer;
  now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if account_id is null then raise exception 'Authentication required'; end if;
  if target_code_hash is null or target_ip_hash is null
     or target_code_hash !~ '^[0-9a-f]{64}$' or target_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid verification request';
  end if;
  select lower(u.email) into account_email from auth.users u where u.id = account_id;
  if account_email is null or public.account_email_is_verified(account_id) then return false; end if;

  account_hash := account_id::text;
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
  values ('email', account_hash, now_at, 1)
  on conflict (bucket_kind, bucket_hash) do update set
    request_count = case when auth_email_otp_limits.window_started_at < now_at - interval '15 minutes' then 1 else least(auth_email_otp_limits.request_count + 1, 4) end,
    window_started_at = case when auth_email_otp_limits.window_started_at < now_at - interval '15 minutes' then now_at else auth_email_otp_limits.window_started_at end
  returning request_count into account_count;
  if account_count > 3 then return false; end if;

  insert into public.email_verification_challenges(user_id, email, code_hash, expires_at, attempts, created_at)
  values (account_id, account_email, target_code_hash, now_at + interval '10 minutes', 0, now_at)
  on conflict (user_id) do update set
    email = excluded.email,
    code_hash = excluded.code_hash,
    expires_at = excluded.expires_at,
    attempts = 0,
    created_at = excluded.created_at;

  delete from public.auth_email_otp_limits where window_started_at < now_at - interval '1 day';
  return true;
end;
$$;
revoke all on function public.issue_email_verification_code(text, text) from public, anon;
grant execute on function public.issue_email_verification_code(text, text) to authenticated;

create or replace function public.verify_email_verification_code(target_email text, target_code_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare challenge public.email_verification_challenges%rowtype; normalized_email text := lower(btrim(target_email)); now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is null or normalized_email is null or char_length(normalized_email) not between 3 and 254
     or target_code_hash is null
     or target_code_hash !~ '^[0-9a-f]{64}$' then return false; end if;

  select c.* into challenge
  from public.email_verification_challenges c
  join auth.users u on u.id = c.user_id
  where c.user_id = auth.uid()
    and lower(c.email) = normalized_email and lower(u.email) = normalized_email
  for update of c;
  if challenge.user_id is null then return false; end if;
  if challenge.expires_at <= now_at or challenge.attempts >= 5 then
    delete from public.email_verification_challenges where user_id = challenge.user_id;
    return false;
  end if;
  if challenge.code_hash is distinct from target_code_hash then
    update public.email_verification_challenges
    set attempts = least(attempts + 1, 5)
    where user_id = challenge.user_id;
    return false;
  end if;

  insert into public.account_email_verifications(user_id, verified_email, verified_at)
  values (challenge.user_id, normalized_email, now_at)
  on conflict (user_id) do update set
    verified_email = excluded.verified_email,
    verified_at = excluded.verified_at;
  delete from public.email_verification_challenges where user_id = challenge.user_id;
  return true;
end;
$$;
revoke all on function public.verify_email_verification_code(text, text) from public;
grant execute on function public.verify_email_verification_code(text, text) to authenticated;

create or replace function public.is_group_member(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_account_email_verified() and exists (
    select 1 from public.members m
    where m.group_id = target_group and m.user_id = auth.uid() and m.status = 'active'
  )
$$;

create or replace function public.current_group_roles(target_group uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select case when public.current_account_email_verified() then
    coalesce(array_agg(a.role_key order by a.role_key), '{}'::text[])
  else '{}'::text[] end
  from public.group_role_assignments a
  where a.group_id = target_group and a.user_id = auth.uid()
$$;

create or replace function public.current_group_permissions(target_group uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select case when public.current_account_email_verified() then
    coalesce(array_agg(granted.permission_key order by granted.permission_key), '{}'::text[])
  else '{}'::text[] end
  from (
    select distinct rp.permission_key
    from public.group_role_assignments a
    join public.role_permissions rp on rp.role_key = a.role_key
    where a.group_id = target_group and a.user_id = auth.uid()
    union
    select 'communications:read' where public.is_group_member(target_group)
    union
    select 'communications:send' where public.is_group_member(target_group)
  ) as granted
$$;

create or replace function public.has_group_role(target_group uuid, required_role text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_account_email_verified() and exists (
    select 1 from public.group_role_assignments a
    where a.group_id = target_group and a.user_id = auth.uid() and a.role_key = required_role
  )
$$;

create or replace function public.has_group_permission(target_group uuid, required_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_account_email_verified() and (
    (required_permission in ('communications:read', 'communications:send') and public.is_group_member(target_group))
    or exists (
      select 1
      from public.group_role_assignments a
      join public.role_permissions rp on rp.role_key = a.role_key
      where a.group_id = target_group and a.user_id = auth.uid()
        and rp.permission_key = required_permission
    )
  )
$$;

drop policy if exists groups_read_authorized on public.groups;
create policy groups_read_authorized on public.groups for select to authenticated using (
  public.current_account_email_verified() and (
    public.is_group_member(id)
    or exists (select 1 from public.members m where m.group_id = groups.id and m.user_id = auth.uid())
    or exists (select 1 from public.group_role_assignments a where a.group_id = groups.id and a.user_id = auth.uid())
  )
);

alter table public.join_requests
  drop constraint if exists join_requests_group_id_user_id_key;

create unique index if not exists join_requests_one_pending_per_group_user_idx
  on public.join_requests(group_id, user_id)
  where status = 'pending';

create index if not exists join_requests_user_history_idx
  on public.join_requests(user_id, created_at desc);

insert into public.permissions (permission_key, label, permission_domain)
values ('membership:requests_review', 'Review Ikimina membership requests', 'administrative')
on conflict (permission_key) do update set label = excluded.label;

-- Membership approval is a specific responsibility. Assign it only to roles
-- chosen by the application's default governance policy; custom grants remain
-- possible through the permission catalog.
insert into public.role_permissions (role_key, permission_key)
select roles.role_key, 'membership:requests_review'
from (values ('chairperson'), ('secretary')) as roles(role_key)
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
values ('chairperson', 'roles:manage')
on conflict do nothing;

create or replace function public.create_group(
  group_name text,
  contribution numeric,
  frequency text,
  currency_code text,
  group_description text,
  group_location text,
  is_discoverable boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_group_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.current_account_email_verified() then
    raise exception 'Verify your email before creating an Ikimina';
  end if;
  insert into public.groups (name, description, location, discoverable, contribution_amount, contribution_frequency, currency, created_by)
  values (group_name, coalesce(group_description, ''), nullif(btrim(group_location), ''), coalesce(is_discoverable, true), contribution, frequency, upper(currency_code), auth.uid())
  returning id into new_group_id;
  insert into public.members (group_id, user_id, full_name, email, legacy_role)
  select new_group_id, p.id, p.full_name, u.email, 'member'
  from public.profiles p join auth.users u on u.id = p.id where p.id = auth.uid();
  insert into public.group_role_assignments (group_id, user_id, role_key, user_email, granted_by)
  values (new_group_id, auth.uid(), 'chairperson', (select lower(email) from auth.users where id = auth.uid()), auth.uid());
  return new_group_id;
end;
$$;

revoke all on function public.create_group(text, numeric, text, text, text, text, boolean) from public, anon;
grant execute on function public.create_group(text, numeric, text, text, text, text, boolean) to authenticated;
-- Prevent the earlier overload from granting committee and technical roles
-- automatically to every group creator.
revoke all on function public.create_group(text, numeric, text, text) from public, anon, authenticated;

create or replace function public.claim_member(target_member uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare claimed_member uuid; target_group uuid; prior_role text;
begin
  if auth.uid() is null or not public.current_account_email_verified() then
    raise exception 'Verify your email before claiming an Ikimina member record';
  end if;
  update public.members as m
  set user_id = auth.uid()
  from auth.users as u
  where m.id = target_member and m.user_id is null and m.status = 'active'
    and u.id = auth.uid() and public.account_email_is_verified(u.id)
    and lower(u.email) = lower(m.email)
  returning m.id, m.group_id, m.legacy_role into claimed_member, target_group, prior_role;
  if claimed_member is null then
    raise exception 'No unlinked active member record matches the verified account email';
  end if;
  if prior_role = 'chairperson' then
    insert into public.group_role_assignments (group_id, user_id, role_key, user_email, granted_by)
    values
      (target_group, auth.uid(), 'chairperson', lower((select email from auth.users where id = auth.uid())), auth.uid()),
      (target_group, auth.uid(), 'committee_member', lower((select email from auth.users where id = auth.uid())), auth.uid()),
      (target_group, auth.uid(), 'system_administrator', lower((select email from auth.users where id = auth.uid())), auth.uid())
    on conflict do nothing;
  elsif prior_role in ('treasurer', 'secretary') then
    insert into public.group_role_assignments (group_id, user_id, role_key, user_email, granted_by)
    values (target_group, auth.uid(), prior_role, lower((select email from auth.users where id = auth.uid())), auth.uid())
    on conflict do nothing;
  end if;
  update public.members set legacy_role = 'member' where id = claimed_member;
  return claimed_member;
end;
$$;

create or replace function public.assign_group_role(target_group uuid, target_email text, target_role text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_user uuid; actor_roles text[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_group_permission(target_group, 'roles:manage') then
    raise exception 'Role management permission required';
  end if;
  if target_role not in ('committee_member', 'group_administrator', 'treasurer', 'secretary', 'system_administrator', 'technician', 'security_administrator', 'super_administrator') then
    raise exception 'This role cannot be assigned through standard role management';
  end if;
  actor_roles := public.current_group_roles(target_group);
  if target_role = 'super_administrator' and not ('super_administrator' = any(actor_roles)) then
    raise exception 'Super-administrator access can only be granted by a super administrator';
  end if;
  if target_role in ('system_administrator', 'technician', 'security_administrator')
     and not ('system_administrator' = any(actor_roles) or 'super_administrator' = any(actor_roles)) then
    raise exception 'Technical roles can only be assigned by a system administrator';
  end if;
  select u.id into target_user from auth.users u
  where lower(u.email) = lower(btrim(target_email)) and public.account_email_is_verified(u.id)
  limit 1;
  if target_user is null then raise exception 'No verified registered account matches that email'; end if;
  if target_user = auth.uid() then raise exception 'You cannot assign roles to your own account'; end if;
  insert into public.group_role_assignments (group_id, user_id, role_key, user_email, granted_by)
  values (target_group, target_user, target_role, lower(btrim(target_email)), auth.uid())
  on conflict (group_id, user_id, role_key) do nothing;
  return target_user;
end;
$$;

create or replace function public.transfer_group_chairperson(target_group uuid, target_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_user uuid; former_chairs uuid[]; actor_roles text[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_group_role(target_group, 'chairperson')
     or not public.has_group_permission(target_group, 'roles:manage') then
    raise exception 'Only the current chairperson can transfer this role';
  end if;
  select u.id into target_user from auth.users u
  where lower(u.email) = lower(btrim(target_email)) and public.account_email_is_verified(u.id)
  limit 1;
  if target_user is null then raise exception 'No verified registered account matches that email'; end if;
  if target_user = auth.uid() then raise exception 'Choose another active member to transfer the chairperson role'; end if;
  if not exists (
    select 1 from public.members m
    where m.group_id = target_group and m.user_id = target_user and m.status = 'active'
  ) then raise exception 'The new chairperson must be an active Ikimina Member'; end if;

  select coalesce(array_agg(a.user_id), '{}'::uuid[]) into former_chairs
  from public.group_role_assignments a
  where a.group_id = target_group and a.role_key = 'chairperson';
  actor_roles := public.current_group_roles(target_group);
  insert into public.audit_logs(group_id, actor_id, action, entity, entity_id, permission_used, authority_roles, before_data, after_data)
  values (target_group, auth.uid(), 'transfer', 'chairperson_role', target_user::text, 'roles:manage', actor_roles,
    jsonb_build_object('previous_chairpersons', former_chairs), jsonb_build_object('new_chairperson', target_user));

  delete from public.group_role_assignments a
  where a.group_id = target_group and a.role_key = 'chairperson';
  delete from public.group_role_assignments a
  where a.group_id = target_group and a.role_key in ('committee_member', 'system_administrator') and a.user_id = any(former_chairs);
  insert into public.group_role_assignments (group_id, user_id, role_key, user_email, granted_by)
  select target_group, target_user, roles.role_key, lower((select u.email from auth.users u where u.id = target_user)), auth.uid()
  from (values ('chairperson'), ('committee_member'), ('system_administrator')) as roles(role_key)
  on conflict (group_id, user_id, role_key) do nothing;
  return target_user;
end;
$$;

drop policy if exists join_requests_self_insert on public.join_requests;
drop policy if exists join_requests_self_read on public.join_requests;
drop policy if exists join_requests_manage on public.join_requests;
drop policy if exists join_requests_review_read on public.join_requests;
create policy join_requests_self_read on public.join_requests for select to authenticated
using (user_id = auth.uid());
create policy join_requests_review_read on public.join_requests for select to authenticated
using (public.has_group_permission(group_id, 'membership:requests_review'));

-- Request state changes now go through the permission-checked RPC below.
revoke insert, update, delete on public.join_requests from authenticated;
revoke insert (group_id, user_id, message), update (status, reviewed_by, reviewed_at)
  on public.join_requests from authenticated;

create or replace function public.request_group_join(target_group uuid, request_message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_id uuid; verified_user uuid; verified_email text; applicant_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select u.id, u.email, coalesce(p.full_name, split_part(u.email, '@', 1))
  into verified_user, verified_email, applicant_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = auth.uid();
  if verified_user is null or not public.current_account_email_verified() then
    raise exception 'Verify your email before requesting membership';
  end if;
  if request_message is not null and char_length(btrim(request_message)) > 1000 then
    raise exception 'The request message is too long';
  end if;
  if not exists (
    select 1 from public.groups g where g.id = target_group and g.discoverable
  ) then raise exception 'This Ikimina is not available for joining'; end if;
  if public.is_group_member(target_group) then raise exception 'You are already an active member'; end if;

  select r.id into request_id
  from public.join_requests r
  where r.group_id = target_group and r.user_id = auth.uid() and r.status = 'pending'
  order by r.created_at desc limit 1;
  if request_id is not null then return request_id; end if;

  insert into public.join_requests(group_id, user_id, message, applicant_name, applicant_email)
  values (target_group, auth.uid(), nullif(btrim(request_message), ''), applicant_name, verified_email)
  on conflict (group_id, user_id) where status = 'pending' do nothing
  returning id into request_id;
  if request_id is null then
    select r.id into request_id
    from public.join_requests r
    where r.group_id = target_group and r.user_id = auth.uid() and r.status = 'pending'
    order by r.created_at desc limit 1;
  end if;
  return request_id;
end;
$$;

create or replace function public.review_group_join_request(
  target_request uuid,
  decision text,
  applicant_message text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  request_row public.join_requests%rowtype;
  account_email text;
  account_name text;
  matched_member uuid;
  member_row public.members%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'Decision must be approved or rejected'; end if;
  if applicant_message is not null and char_length(btrim(applicant_message)) > 1000 then
    raise exception 'The member message is too long';
  end if;

  select r.* into request_row
  from public.join_requests r
  where r.id = target_request
  for update;
  if request_row.id is null then raise exception 'Membership request was not found'; end if;
  if not public.has_group_permission(request_row.group_id, 'membership:requests_review') then
    raise exception 'Membership request review permission required';
  end if;
  if request_row.status <> 'pending' then raise exception 'This request has already been reviewed'; end if;

  if decision = 'approved' then
    select u.email, coalesce(p.full_name, split_part(u.email, '@', 1))
    into account_email, account_name
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = request_row.user_id and public.account_email_is_verified(u.id);
    if account_email is null then raise exception 'The applicant account is not email verified'; end if;

    select m.id into matched_member
    from public.members m
    where m.group_id = request_row.group_id and m.user_id = request_row.user_id
    for update;

    if matched_member is null then
      select m.id, m.user_id into member_row.id, member_row.user_id
      from public.members m
      where m.group_id = request_row.group_id
        and lower(btrim(m.email)) = lower(btrim(account_email))
      for update;
      if member_row.id is not null and member_row.user_id is not null
         and member_row.user_id <> request_row.user_id then
        raise exception 'A different account is already linked to this member record';
      end if;

      if member_row.id is not null then
        update public.members m
        set user_id = request_row.user_id,
            full_name = account_name,
            email = account_email,
            status = 'active'
        where m.id = member_row.id
        returning m.id into matched_member;
      else
        insert into public.members(group_id, user_id, full_name, email, status)
        values (request_row.group_id, request_row.user_id, account_name, account_email, 'active')
        returning id into matched_member;
      end if;
    else
      update public.members m set status = 'active'
      where m.id = matched_member;
    end if;
  end if;

  update public.join_requests
  set status = decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      decision_message = nullif(btrim(applicant_message), '')
  where id = target_request;

  return matched_member;
end;
$$;

revoke all on function public.request_group_join(uuid, text) from public, anon;
revoke all on function public.review_group_join_request(uuid, text, text) from public, anon;
grant execute on function public.request_group_join(uuid, text) to authenticated;
grant execute on function public.review_group_join_request(uuid, text, text) to authenticated;

create or replace function public.notify_membership_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid; group_name text;
begin
  select g.name into group_name from public.groups g where g.id = new.group_id;
  if tg_op = 'INSERT' then
    for recipient in
      select distinct a.user_id
      from public.group_role_assignments a
      join public.role_permissions rp on rp.role_key = a.role_key
      where a.group_id = new.group_id
        and rp.permission_key = 'membership:requests_review'
        and a.user_id <> new.user_id
    loop
      insert into public.notifications(user_id, title, body, href)
      values (recipient, 'Membership request received', 'A person requested to join ' || group_name || '.', '/dashboard/membership-requests');
    end loop;
    return new;
  end if;

  if old.status is distinct from new.status and new.status in ('approved', 'rejected') then
    insert into public.notifications(user_id, title, body, href)
    values (
      new.user_id,
      case when new.status = 'approved' then 'Your membership was approved' else 'Membership request update' end,
      case when new.status = 'approved'
        then 'Your request to join ' || group_name || ' was approved. You are now a Member.'
        else 'Your request to join ' || group_name || ' was not approved.' end
        || case when new.decision_message is null then '' else ' ' || new.decision_message end,
      case when new.status = 'approved'
        then '/dashboard?group=' || new.group_id::text
        else '/dashboard/join' end
    );
  end if;
  return new;
end;
$$;

revoke all on function public.notify_membership_request() from public, anon, authenticated;
drop trigger if exists membership_request_notify on public.join_requests;
create trigger membership_request_notify after insert or update of status on public.join_requests
for each row execute function public.notify_membership_request();
