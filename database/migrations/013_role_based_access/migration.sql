-- Separate Phyaio Cycle membership from the organizational and technical roles a
-- person is assigned. The catalog is fixed in SQL so users cannot invent
-- roles or grant arbitrary permissions from the client.
create table public.group_role_catalog (
  role_key text primary key,
  label text not null unique,
  role_domain text not null check (role_domain in ('governance', 'financial', 'administrative', 'technical'))
);

insert into public.group_role_catalog (role_key, label, role_domain) values
  ('chairperson', 'Chairperson', 'governance'),
  ('committee_member', 'Committee member', 'governance'),
  ('group_administrator', 'Ikimina administrator', 'administrative'),
  ('treasurer', 'Treasurer', 'financial'),
  ('secretary', 'Secretary', 'administrative'),
  ('system_administrator', 'System administrator', 'technical'),
  ('technician', 'Technician', 'technical'),
  ('security_administrator', 'Security administrator', 'technical'),
  ('super_administrator', 'Super administrator', 'technical');

create table public.permissions (
  permission_key text primary key,
  label text not null,
  permission_domain text not null check (permission_domain in ('governance', 'financial', 'administrative', 'technical'))
);

insert into public.permissions (permission_key, label, permission_domain) values
  ('groups:read', 'View Ikimina information', 'administrative'),
  ('groups:manage', 'Manage Ikimina information', 'administrative'),
  ('members:read', 'View group membership records', 'administrative'),
  ('members:manage', 'Create and update membership records', 'administrative'),
  ('members:delete', 'Remove membership records', 'administrative'),
  ('roles:read', 'View assigned roles', 'administrative'),
  ('roles:manage', 'Assign and remove roles', 'administrative'),
  ('contributions:read', 'View group contributions', 'financial'),
  ('contributions:record', 'Record contributions', 'financial'),
  ('contributions:verify', 'Verify contribution payments', 'financial'),
  ('loans:read', 'View group loans', 'financial'),
  ('loans:approve', 'Approve or reject loan requests', 'financial'),
  ('loans:disburse', 'Disburse approved loans', 'financial'),
  ('loans:manage', 'Manage loan records', 'financial'),
  ('repayments:read', 'View group loan repayments', 'financial'),
  ('repayments:record', 'Record loan repayments', 'financial'),
  ('meetings:read', 'View meeting records', 'administrative'),
  ('meetings:manage', 'Manage meetings and attendance', 'administrative'),
  ('announcements:manage', 'Send official announcements', 'administrative'),
  ('communications:read', 'Read authorized group conversations', 'administrative'),
  ('communications:send', 'Send messages to authorized group participants', 'administrative'),
  ('cycles:manage', 'Manage Ikimina periods and cycles', 'administrative'),
  ('reports:read', 'View group reports', 'financial'),
  ('financial:read', 'View group financial summaries', 'financial'),
  ('financial:adjust', 'Record authorized financial adjustments', 'financial'),
  ('shares:manage', 'Manage member shares', 'financial'),
  ('social_fund:read', 'View social-fund records', 'financial'),
  ('social_fund:manage', 'Manage social-fund contributions and expenses', 'financial'),
  ('profit:calculate', 'Calculate group profit and member shares', 'financial'),
  ('profit:distribute', 'Approve and distribute group profit', 'financial'),
  ('financial_audit:read', 'Review financial audit history', 'financial'),
  ('audit:read', 'View audit history', 'technical'),
  ('system:users_manage', 'Manage technical access assignments', 'technical'),
  ('system:configure', 'Manage technical configuration', 'technical'),
  ('system:maintenance', 'Control maintenance and system availability', 'technical'),
  ('system:lock', 'Lock or unlock system access', 'technical'),
  ('system:modules', 'Control module availability', 'technical'),
  ('system:backup', 'Manage backups and recovery', 'technical'),
  ('system:monitor', 'Monitor technical status', 'technical'),
  ('security:manage', 'Manage security configuration', 'technical'),
  ('security:audit', 'Review security events', 'technical'),
  ('support:manage', 'Provide technical support', 'technical'),
  ('superadmin:manage', 'Assign exceptional super-administrator access', 'technical');

create table public.role_permissions (
  role_key text not null references public.group_role_catalog(role_key) on delete cascade,
  permission_key text not null references public.permissions(permission_key) on delete cascade,
  primary key (role_key, permission_key)
);

insert into public.role_permissions (role_key, permission_key) values
  ('chairperson', 'groups:read'), ('chairperson', 'groups:manage'),
  ('chairperson', 'members:read'), ('chairperson', 'members:manage'), ('chairperson', 'members:delete'),
  ('chairperson', 'contributions:read'), ('chairperson', 'loans:read'), ('chairperson', 'loans:approve'),
  ('chairperson', 'repayments:read'),
  ('chairperson', 'meetings:read'), ('chairperson', 'meetings:manage'), ('chairperson', 'announcements:manage'),
  ('chairperson', 'reports:read'), ('chairperson', 'financial:read'), ('chairperson', 'social_fund:read'),
  ('chairperson', 'profit:distribute'), ('chairperson', 'communications:read'), ('chairperson', 'communications:send'),
  ('chairperson', 'cycles:manage'), ('chairperson', 'financial_audit:read'), ('chairperson', 'audit:read'),
  ('committee_member', 'groups:read'), ('committee_member', 'members:read'),
  ('committee_member', 'contributions:read'), ('committee_member', 'loans:read'), ('committee_member', 'loans:approve'),
  ('committee_member', 'repayments:read'),
  ('committee_member', 'meetings:read'), ('committee_member', 'reports:read'), ('committee_member', 'financial:read'),
  ('committee_member', 'communications:read'), ('committee_member', 'profit:distribute'), ('committee_member', 'cycles:manage'), ('committee_member', 'financial_audit:read'),
  ('group_administrator', 'groups:read'), ('group_administrator', 'groups:manage'),
  ('group_administrator', 'members:read'), ('group_administrator', 'members:manage'),
  ('group_administrator', 'contributions:read'), ('group_administrator', 'loans:read'),
  ('group_administrator', 'repayments:read'),
  ('group_administrator', 'meetings:read'), ('group_administrator', 'meetings:manage'),
  ('group_administrator', 'announcements:manage'), ('group_administrator', 'reports:read'),
  ('group_administrator', 'financial:read'), ('group_administrator', 'communications:read'), ('group_administrator', 'communications:send'), ('group_administrator', 'cycles:manage'), ('group_administrator', 'financial_audit:read'),
  ('treasurer', 'groups:read'), ('treasurer', 'members:read'), ('treasurer', 'contributions:read'),
  ('treasurer', 'contributions:record'), ('treasurer', 'contributions:verify'), ('treasurer', 'loans:read'),
  ('treasurer', 'loans:disburse'), ('treasurer', 'loans:manage'), ('treasurer', 'repayments:read'),
  ('treasurer', 'repayments:record'), ('treasurer', 'reports:read'), ('treasurer', 'financial:read'),
  ('treasurer', 'financial:adjust'), ('treasurer', 'shares:manage'), ('treasurer', 'social_fund:read'),
  ('treasurer', 'social_fund:manage'), ('treasurer', 'profit:calculate'), ('treasurer', 'communications:read'), ('treasurer', 'financial_audit:read'),
  ('secretary', 'groups:read'), ('secretary', 'members:read'),
  ('secretary', 'members:manage'), ('secretary', 'meetings:read'), ('secretary', 'meetings:manage'),
  ('secretary', 'announcements:manage'), ('secretary', 'reports:read'), ('secretary', 'communications:read'), ('secretary', 'communications:send'), ('secretary', 'cycles:manage'),
  ('system_administrator', 'groups:read'), ('system_administrator', 'roles:read'),
  ('system_administrator', 'roles:manage'), ('system_administrator', 'system:users_manage'),
  ('system_administrator', 'system:configure'), ('system_administrator', 'system:maintenance'),
  ('system_administrator', 'system:lock'), ('system_administrator', 'system:modules'), ('system_administrator', 'system:backup'),
  ('system_administrator', 'system:monitor'), ('system_administrator', 'audit:read'),
  ('technician', 'groups:read'), ('technician', 'support:manage'), ('technician', 'system:monitor'),
  ('security_administrator', 'groups:read'), ('security_administrator', 'roles:read'),
  ('security_administrator', 'system:monitor'), ('security_administrator', 'security:manage'),
  ('security_administrator', 'security:audit'), ('security_administrator', 'audit:read'),
  ('super_administrator', 'superadmin:manage');

-- The exceptional role is intentionally explicit and tightly held. It receives
-- all permissions in addition to its dedicated role-assignment permission.
insert into public.role_permissions (role_key, permission_key)
select 'super_administrator', permission_key from public.permissions
where permission_key <> 'superadmin:manage'
on conflict do nothing;

create table public.group_role_assignments (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null references public.group_role_catalog(role_key) on delete restrict,
  user_email text,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (group_id, user_id, role_key)
);

create index group_role_assignments_user_idx on public.group_role_assignments(user_id, group_id);

-- Keep the old role label only as a migration bridge for unclaimed members.
-- A label is never used for authorization; permissions come from the assignment table.
alter table public.members rename column role to legacy_role;
alter table public.members alter column legacy_role drop default;
alter table public.members alter column legacy_role type text using legacy_role::text;
alter table public.members alter column legacy_role set default 'member';

insert into public.group_role_assignments (group_id, user_id, role_key, user_email, granted_by)
select m.group_id, m.user_id, m.legacy_role, u.email, g.created_by
from public.members m
join public.groups g on g.id = m.group_id
join auth.users u on u.id = m.user_id
where m.user_id is not null and m.legacy_role in ('chairperson', 'treasurer', 'secretary')
on conflict do nothing;

insert into public.group_role_assignments (group_id, user_id, role_key, user_email, granted_by)
select m.group_id, m.user_id, derived.role_key, u.email, g.created_by
from public.members m
join public.groups g on g.id = m.group_id
join auth.users u on u.id = m.user_id
cross join (values ('committee_member'), ('system_administrator')) as derived(role_key)
where m.user_id is not null and m.legacy_role = 'chairperson'
on conflict do nothing;

update public.members set legacy_role = 'member' where user_id is not null;

create or replace function public.is_group_member(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.group_id = target_group and m.user_id = auth.uid() and m.status = 'active'
  )
$$;

create or replace function public.current_group_roles(target_group uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(a.role_key order by a.role_key), '{}'::text[])
  from public.group_role_assignments a
  where a.group_id = target_group and a.user_id = auth.uid()
$$;

create or replace function public.current_group_permissions(target_group uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(granted.permission_key order by granted.permission_key), '{}'::text[])
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
  select exists (
    select 1 from public.group_role_assignments a
    where a.group_id = target_group and a.user_id = auth.uid() and a.role_key = required_role
  )
$$;

create or replace function public.has_group_permission(target_group uuid, required_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (
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

revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.current_group_roles(uuid) from public;
revoke all on function public.current_group_permissions(uuid) from public;
revoke all on function public.has_group_role(uuid, text) from public;
revoke all on function public.has_group_permission(uuid, text) from public;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.current_group_roles(uuid) to authenticated;
grant execute on function public.current_group_permissions(uuid) to authenticated;
grant execute on function public.has_group_role(uuid, text) to authenticated;
grant execute on function public.has_group_permission(uuid, text) to authenticated;

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
  select u.id into target_user
  from auth.users u
  where lower(u.email) = lower(btrim(target_email))
    and u.email_confirmed_at is not null
  limit 1;
  if target_user is null then raise exception 'No verified registered account matches that email'; end if;
  if target_user = auth.uid() then raise exception 'You cannot assign roles to your own account'; end if;
  insert into public.group_role_assignments (group_id, user_id, role_key, user_email, granted_by)
  values (target_group, target_user, target_role, lower(btrim(target_email)), auth.uid())
  on conflict (group_id, user_id, role_key) do nothing;
  return target_user;
end;
$$;

create or replace function public.remove_group_role(target_group uuid, target_user uuid, target_role text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_roles text[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_group_permission(target_group, 'roles:manage') then
    raise exception 'Role management permission required';
  end if;
  actor_roles := public.current_group_roles(target_group);
  if target_role = 'chairperson' then raise exception 'The chairperson role must be transferred'; end if;
  if target_role = 'super_administrator' and not public.has_group_permission(target_group, 'superadmin:manage') then
    raise exception 'Only another super administrator can remove this role';
  end if;
  if target_role = 'system_administrator' and not ('system_administrator' = any(actor_roles) or 'super_administrator' = any(actor_roles)) then
    raise exception 'Only a system administrator can remove technical roles';
  end if;
  if target_user = auth.uid() then raise exception 'You cannot remove roles from your own account'; end if;
  if target_role = 'system_administrator' and exists (
    select 1 from public.group_role_assignments a
    where a.group_id = target_group and a.user_id = target_user and a.role_key = 'chairperson'
  ) then raise exception 'The chairperson system-administrator role cannot be removed'; end if;
  if target_role = 'committee_member' and exists (
    select 1 from public.group_role_assignments a
    where a.group_id = target_group and a.user_id = target_user and a.role_key = 'chairperson'
  ) then raise exception 'The chairperson committee role cannot be removed'; end if;
  delete from public.group_role_assignments a
  where a.group_id = target_group and a.user_id = target_user and a.role_key = target_role;
  if not found then raise exception 'That role assignment was not found'; end if;
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
  select u.id into target_user
  from auth.users u
  where lower(u.email) = lower(btrim(target_email))
    and u.email_confirmed_at is not null
  limit 1;
  if target_user is null then raise exception 'No verified registered account matches that email'; end if;
  if target_user = auth.uid() then raise exception 'Choose another active member to transfer the chairperson role'; end if;
  if not exists (
    select 1 from public.members m
    where m.group_id = target_group and m.user_id = target_user and m.status = 'active'
  ) then raise exception 'The new chairperson must be an active member of this Phyaio Cycle'; end if;

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

revoke all on function public.assign_group_role(uuid, text, text) from public;
revoke all on function public.remove_group_role(uuid, uuid, text) from public;
revoke all on function public.transfer_group_chairperson(uuid, text) from public;
grant execute on function public.assign_group_role(uuid, text, text) to authenticated;
grant execute on function public.remove_group_role(uuid, uuid, text) to authenticated;
grant execute on function public.transfer_group_chairperson(uuid, text) to authenticated;

-- New groups start with separate membership, governance, and technical access.
create or replace function public.create_group(group_name text, contribution numeric, frequency text, currency_code text default 'RWF')
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_group_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.groups (name, contribution_amount, contribution_frequency, currency, created_by)
  values (group_name, contribution, frequency, upper(currency_code), auth.uid())
  returning id into new_group_id;
  insert into public.members (group_id, user_id, full_name, email, legacy_role)
  select new_group_id, p.id, p.full_name, u.email, 'member'
  from public.profiles p join auth.users u on u.id = p.id where p.id = auth.uid();
  insert into public.group_role_assignments (group_id, user_id, role_key, user_email, granted_by)
  values
    (new_group_id, auth.uid(), 'chairperson', (select lower(email) from auth.users where id = auth.uid()), auth.uid()),
    (new_group_id, auth.uid(), 'committee_member', (select lower(email) from auth.users where id = auth.uid()), auth.uid()),
    (new_group_id, auth.uid(), 'system_administrator', (select lower(email) from auth.users where id = auth.uid()), auth.uid());
  return new_group_id;
end;
$$;

revoke all on function public.create_group(text, numeric, text, text) from public;
grant execute on function public.create_group(text, numeric, text, text) to authenticated;

-- Applying an unclaimed legacy officer record transfers the old label into an
-- actual role assignment only after the verified-email claim succeeds.
create or replace function public.claim_member(target_member uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare claimed_member uuid; target_group uuid; prior_role text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.members as m
  set user_id = auth.uid()
  from auth.users as u
  where m.id = target_member
    and m.user_id is null
    and m.status = 'active'
    and u.id = auth.uid()
    and u.email_confirmed_at is not null
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

revoke all on function public.claim_member(uuid) from public;
grant execute on function public.claim_member(uuid) to authenticated;

alter table public.group_role_assignments enable row level security;
alter table public.group_role_catalog enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

drop policy if exists profiles_read_group on public.profiles;
drop policy if exists groups_read_member on public.groups;
drop policy if exists groups_update_leaders on public.groups;
drop policy if exists members_read_group on public.members;
drop policy if exists members_insert_leaders on public.members;
drop policy if exists members_update_leaders on public.members;
drop policy if exists members_delete_chair on public.members;
drop policy if exists contributions_read_group on public.contributions;
drop policy if exists contributions_insert_member on public.contributions;
drop policy if exists contributions_verify_leaders on public.contributions;
drop policy if exists savings_adjustment_read on public.savings_adjustments;
drop policy if exists savings_adjustment_manage on public.savings_adjustments;
drop policy if exists loans_read_group on public.loans;
drop policy if exists loans_apply_member on public.loans;
drop policy if exists loans_decide_leaders on public.loans;
drop policy if exists loan_repayments_read on public.loan_repayments;
drop policy if exists loan_repayments_add_leaders on public.loan_repayments;
drop policy if exists meetings_read_group on public.meetings;
drop policy if exists meetings_manage_leaders on public.meetings;
drop policy if exists attendance_read_group on public.attendance;
drop policy if exists attendance_manage_leaders on public.attendance;
drop policy if exists audit_logs_read_leaders on public.audit_logs;

drop function if exists public.current_group_role(uuid);
drop type public.group_role;

create policy group_roles_catalog_read on public.group_role_catalog for select to authenticated using (true);
create policy permissions_catalog_read on public.permissions for select to authenticated using (true);
create policy role_permissions_catalog_read on public.role_permissions for select to authenticated using (true);
create policy group_role_assignments_read on public.group_role_assignments for select to authenticated
using (user_id = auth.uid() or public.has_group_permission(group_id, 'roles:read')
  or public.has_group_permission(group_id, 'roles:manage'));

revoke all on table public.group_role_catalog, public.permissions, public.role_permissions, public.group_role_assignments from anon, authenticated;
grant select on public.group_role_catalog, public.permissions, public.role_permissions, public.group_role_assignments to authenticated;

create policy profiles_read_group on public.profiles for select to authenticated using (
  id = auth.uid()
  or exists (select 1 from public.members m where m.user_id = profiles.id and public.is_group_member(m.group_id))
  or exists (select 1 from public.group_role_assignments a where a.user_id = profiles.id and public.is_group_member(a.group_id))
  or exists (select 1 from public.group_role_assignments a where a.user_id = profiles.id and (public.has_group_permission(a.group_id, 'roles:read') or public.has_group_permission(a.group_id, 'roles:manage')))
);
create policy groups_read_authorized on public.groups for select to authenticated using (
  public.is_group_member(id) or exists (
    select 1 from public.group_role_assignments a where a.group_id = groups.id and a.user_id = auth.uid()
  )
);
create policy groups_update_authorized on public.groups for update to authenticated
using (public.has_group_permission(id, 'groups:manage'))
with check (public.has_group_permission(id, 'groups:manage'));

create policy members_read_authorized on public.members for select to authenticated using (
  user_id = auth.uid() or public.has_group_permission(group_id, 'members:read')
);
create policy members_insert_authorized on public.members for insert to authenticated
with check (public.has_group_permission(group_id, 'members:manage'));
create policy members_update_authorized on public.members for update to authenticated
using (public.has_group_permission(group_id, 'members:manage'))
with check (public.has_group_permission(group_id, 'members:manage'));
create policy members_delete_authorized on public.members for delete to authenticated
using (public.has_group_permission(group_id, 'members:delete'));

create policy contributions_read_authorized on public.contributions for select to authenticated using (
  public.has_group_permission(group_id, 'contributions:read')
  or exists (select 1 from public.members m where m.id = contributions.member_id and m.user_id = auth.uid() and m.status = 'active')
);
create policy contributions_insert_authorized on public.contributions for insert to authenticated with check (
  status = 'pending' and verified_by is null and verified_at is null
  and exists (select 1 from public.members m where m.id = contributions.member_id and m.group_id = contributions.group_id and m.status = 'active')
  and (
    (public.is_group_member(group_id) and exists (select 1 from public.members m where m.id = contributions.member_id and m.user_id = auth.uid()))
    or public.has_group_permission(group_id, 'contributions:record')
  )
);
create policy contributions_verify_authorized on public.contributions for update to authenticated
using (public.has_group_permission(group_id, 'contributions:verify'))
with check (public.has_group_permission(group_id, 'contributions:verify'));

create policy savings_adjustment_read_authorized on public.savings_adjustments for select to authenticated using (
  public.has_group_permission(group_id, 'financial:read')
);
create policy savings_adjustment_manage_authorized on public.savings_adjustments for insert to authenticated with check (
  created_by = auth.uid() and public.has_group_permission(group_id, 'financial:adjust')
);

create policy loans_read_authorized on public.loans for select to authenticated using (
  public.has_group_permission(group_id, 'loans:read')
  or exists (select 1 from public.members m where m.id = loans.member_id and m.user_id = auth.uid() and m.status = 'active')
);
create policy loans_apply_member on public.loans for insert to authenticated with check (
  status = 'pending' and approved_by is null and principal = outstanding_amount
  and public.is_group_member(group_id)
  and exists (select 1 from public.members m where m.id = loans.member_id and m.group_id = loans.group_id and m.user_id = auth.uid())
);
create policy loans_decide_authorized on public.loans for update to authenticated
using (
  public.has_group_permission(group_id, 'loans:approve')
  or public.has_group_permission(group_id, 'loans:disburse')
  or public.has_group_permission(group_id, 'loans:manage')
)
with check (
  public.has_group_permission(group_id, 'loans:approve')
  or public.has_group_permission(group_id, 'loans:disburse')
  or public.has_group_permission(group_id, 'loans:manage')
);
create policy loan_repayments_read_authorized on public.loan_repayments for select to authenticated using (
  exists (
    select 1 from public.loans l
    where l.id = loan_repayments.loan_id
      and (public.has_group_permission(l.group_id, 'repayments:read')
        or exists (select 1 from public.members m where m.id = l.member_id and m.user_id = auth.uid() and m.status = 'active'))
  )
);
create policy loan_repayments_add_authorized on public.loan_repayments for insert to authenticated with check (
  received_by = auth.uid() and exists (
    select 1 from public.loans l
    where l.id = loan_repayments.loan_id and public.has_group_permission(l.group_id, 'repayments:record')
  )
);

create policy meetings_read_authorized on public.meetings for select to authenticated using (
  public.is_group_member(group_id) or public.has_group_permission(group_id, 'meetings:read')
);
create policy meetings_manage_authorized on public.meetings for all to authenticated
using (public.has_group_permission(group_id, 'meetings:manage'))
with check (created_by = auth.uid() and public.has_group_permission(group_id, 'meetings:manage'));
create policy attendance_read_authorized on public.attendance for select to authenticated using (
  exists (select 1 from public.meetings mt where mt.id = attendance.meeting_id and (public.is_group_member(mt.group_id) or public.has_group_permission(mt.group_id, 'meetings:read')))
);
create policy attendance_manage_authorized on public.attendance for all to authenticated
using (exists (select 1 from public.meetings mt where mt.id = attendance.meeting_id and public.has_group_permission(mt.group_id, 'meetings:manage')))
with check (recorded_by = auth.uid() and exists (select 1 from public.meetings mt where mt.id = attendance.meeting_id and public.has_group_permission(mt.group_id, 'meetings:manage')));
create policy audit_logs_read_authorized on public.audit_logs for select to authenticated using (
  group_id is not null and (
    (entity in ('contributions', 'loans', 'loan_repayments', 'savings_adjustments')
      and public.has_group_permission(group_id, 'financial_audit:read'))
    or (entity = 'groups' and public.has_group_permission(group_id, 'groups:manage'))
    or (entity = 'members' and public.has_group_permission(group_id, 'members:read'))
    or (entity in ('meetings', 'attendance') and public.has_group_permission(group_id, 'meetings:read'))
    or (entity in ('group_role_assignments', 'chairperson_role') and (
      public.has_group_permission(group_id, 'roles:read')
      or public.has_group_permission(group_id, 'roles:manage')
      or public.has_group_permission(group_id, 'audit:read')
    ))
  )
);

-- Group metadata stays visible while the stored reserve amount remains behind
-- the financial-summary permission boundary.
revoke select on public.groups from authenticated;
grant select (id, name, currency, contribution_amount, contribution_frequency, created_by, created_at, updated_at)
on public.groups to authenticated;

revoke insert (group_id, full_name, email, phone, legacy_role, status),
       update (full_name, email, phone, legacy_role, status)
on public.members from authenticated;
grant insert (group_id, full_name, email, phone, status) on public.members to authenticated;
grant update (full_name, email, phone, status) on public.members to authenticated;

-- Preserve the decision behind important changes, together with before/after
-- values and the actor's active roles at the time of the event.
alter table public.audit_logs add column permission_used text;
alter table public.audit_logs add column authority_roles text[] not null default '{}'::text[];
alter table public.audit_logs add column before_data jsonb;
alter table public.audit_logs add column after_data jsonb;

create or replace function public.write_financial_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_data jsonb; before_row jsonb; after_row jsonb; group_key uuid; row_id text;
  actor uuid; used_permission text; actor_roles text[];
begin
  before_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_row := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  row_data := coalesce(after_row, before_row);
  group_key := nullif(row_data ->> 'group_id', '')::uuid;
  if group_key is null and tg_table_name = 'attendance' then
    select mt.group_id into group_key
    from public.meetings mt
    where mt.id = nullif(row_data ->> 'meeting_id', '')::uuid;
  end if;
  row_id := coalesce(row_data ->> 'id', row_data ->> 'user_id');
  actor := auth.uid();
  actor_roles := case when group_key is null then '{}'::text[] else public.current_group_roles(group_key) end;
  if tg_table_name = 'group_role_assignments' and tg_op = 'DELETE' and old.user_id = actor then
    actor_roles := array_append(actor_roles, old.role_key);
  end if;
  if group_key is not null and public.is_group_member(group_key) then actor_roles := array_append(actor_roles, 'member'); end if;
  used_permission := case
    when tg_table_name = 'members' then 'members:manage'
    when tg_table_name = 'contributions' and tg_op = 'UPDATE' then 'contributions:verify'
    when tg_table_name = 'contributions' then 'contributions:record'
    when tg_table_name = 'loans' and tg_op = 'UPDATE' and old.status = 'active' and new.status = 'repaid' then 'repayments:record'
    when tg_table_name = 'loans' and tg_op = 'UPDATE' and old.status = 'pending' then 'loans:approve'
    when tg_table_name = 'loans' and tg_op = 'UPDATE' then 'loans:disburse'
    when tg_table_name = 'loans' then 'loans:apply'
    when tg_table_name = 'groups' then 'groups:manage'
    when tg_table_name in ('meetings', 'attendance') then 'meetings:manage'
    when tg_table_name = 'group_role_assignments' then 'roles:manage'
    else null
  end;
  insert into public.audit_logs(group_id, actor_id, action, entity, entity_id, permission_used, authority_roles, before_data, after_data)
  values (group_key, actor, lower(tg_op), tg_table_name, row_id, used_permission, actor_roles, before_row, after_row);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger group_role_assignments_audit after insert or update or delete on public.group_role_assignments
for each row execute function public.write_financial_audit();
create trigger attendance_audit after insert or update or delete on public.attendance
for each row execute function public.write_financial_audit();

create or replace function public.write_loan_repayment_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare group_key uuid; actor_roles text[];
begin
  select l.group_id into group_key from public.loans l where l.id = new.loan_id;
  actor_roles := public.current_group_roles(group_key);
  if public.is_group_member(group_key) then actor_roles := array_append(actor_roles, 'member'); end if;
  insert into public.audit_logs(group_id, actor_id, action, entity, entity_id, permission_used, authority_roles, after_data)
  values (group_key, auth.uid(), 'insert', 'loan_repayments', new.id::text, 'repayments:record', actor_roles, to_jsonb(new));
  return new;
end;
$$;
create trigger loan_repayments_audit after insert on public.loan_repayments
for each row execute function public.write_loan_repayment_audit();

create or replace function public.guard_loan_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
declare funds numeric;
begin
  if new.status is distinct from old.status then
    if old.status = 'pending' and new.status in ('approved', 'rejected') then
      if not public.has_group_permission(new.group_id, 'loans:approve') then raise exception 'Loan approval permission required'; end if;
    elsif old.status = 'approved' and new.status = 'active' then
      if not public.has_group_permission(new.group_id, 'loans:disburse') then raise exception 'Loan disbursement permission required'; end if;
    elsif old.status = 'active' and new.status = 'repaid' and new.outstanding_amount = 0 and pg_trigger_depth() > 1 then
      null;
    else
      raise exception 'Invalid loan status transition';
    end if;
    if old.status = 'pending' and new.status = 'approved' then
      perform pg_advisory_xact_lock(hashtextextended(new.group_id::text, 0));
      select available_balance into funds from public.savings_summary where group_id = new.group_id;
      if coalesce(funds, 0) < new.principal then raise exception 'The group does not have enough available funds'; end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.write_financial_audit() from public, anon, authenticated;
revoke all on function public.write_loan_repayment_audit() from public, anon, authenticated;
revoke all on function public.guard_loan_transition() from public, anon, authenticated;

-- The view owner reads the underlying ledger, but the barrier predicate only
-- returns a row when the caller has explicit financial-summary access.
alter view public.savings_summary reset (security_invoker);
alter view public.savings_summary set (security_barrier = true);
create or replace view public.savings_summary as
with contribution_totals as (
  select group_id, coalesce(sum(amount), 0) as collected
  from public.contributions where status = 'verified' and contribution_type <> 'social' group by group_id
), loan_totals as (
  select group_id, coalesce(sum(outstanding_amount), 0) as outstanding
  from public.loans where status in ('active', 'approved') group by group_id
), adjustments as (
  select group_id, coalesce(sum(amount), 0) as adjusted
  from public.savings_adjustments group by group_id
)
select g.id as group_id, g.currency,
       coalesce(c.collected, 0)::numeric(15,0) as total_contributions,
       coalesce(l.outstanding, 0)::numeric(15,0) as total_loans_outstanding,
       g.reserve_balance + coalesce(a.adjusted, 0)::numeric(15,0) as reserve_balance,
       (coalesce(c.collected, 0) - coalesce(l.outstanding, 0) - g.reserve_balance - coalesce(a.adjusted, 0))::numeric(15,0) as available_balance,
       now() as as_of
from public.groups g
left join contribution_totals c on c.group_id = g.id
left join loan_totals l on l.group_id = g.id
left join adjustments a on a.group_id = g.id
where public.has_group_permission(g.id, 'financial:read');
grant select on public.savings_summary to authenticated;

comment on table public.group_role_assignments is 'Group-scoped roles independent from membership; technical-only users may be assigned without a member record.';
comment on column public.group_role_assignments.user_email is 'Email snapshot used by authorized role managers to identify the assigned account.';
comment on column public.members.legacy_role is 'Migration bridge for an unclaimed legacy member role; never used for authorization.';
comment on column public.audit_logs.permission_used is 'Permission context recorded for the audited action.';
comment on column public.audit_logs.authority_roles is 'Roles held by the actor when the audited action occurred; member is included when applicable.';
