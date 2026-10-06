-- Chairperson authority composes the technical System Administrator and
-- governance Committee Member roles. It does not grant financial approval or
-- distribution powers by title. Financial responsibilities remain separate.

delete from public.role_permissions
where role_key = 'committee_member'
  and permission_key in ('loans:approve', 'profit:distribute', 'cycles:manage');

-- Technical roles manage access and system availability, not group cycles or
-- financial closings. Those data domains require a separate operational role.
delete from public.role_permissions
where role_key in ('system_administrator','technician','security_administrator')
  and permission_key in ('cycles:read','cycles:manage','closing:read');

-- General security-audit access must not reveal private conversation contents.
drop policy if exists audit_logs_read_authorized on public.audit_logs;
create policy audit_logs_read_authorized on public.audit_logs for select to authenticated using (
  group_id is not null and (
    (entity in ('contributions','loans','loan_repayments','savings_adjustments','share_transactions','bank_transactions','social_fund_requests','expenses','loan_interest_charges','financial_period_closings','financial_correction_requests','profit_calculations') and public.has_group_permission(group_id,'financial_audit:read'))
    or (entity in ('groups','group_cycles','cycle_members','group_system_controls') and (public.has_group_permission(group_id,'groups:manage') or public.has_group_permission(group_id,'audit:read')))
    or (entity='members' and public.has_group_permission(group_id,'members:read'))
    or (entity in ('meetings','attendance','meeting_decisions','meeting_votes','meeting_documents') and public.has_group_permission(group_id,'meetings:read'))
    or (entity in ('group_role_assignments','chairperson_role','join_requests','group_invitations','group_announcements') and (public.has_group_permission(group_id,'roles:read') or public.has_group_permission(group_id,'roles:manage') or public.has_group_permission(group_id,'audit:read')))
    or (entity in ('chat_threads','chat_messages') and public.has_group_permission(group_id,'messages:moderate'))
  )
);

delete from public.role_permissions where role_key = 'chairperson';
insert into public.role_permissions (role_key, permission_key)
select 'chairperson', permission_key
from public.role_permissions
where role_key in ('system_administrator', 'committee_member')
on conflict do nothing;

comment on table public.role_permissions is
  'Role capabilities are explicit permission assignments. Chairperson capabilities are composed from System Administrator and Committee Member; financial approval remains separately assigned.';

create or replace function public.set_group_system_controls(
  target_group uuid,
  target_status text,
  target_message text,
  target_disabled_modules text[]
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_row public.group_system_controls%rowtype; status_changed boolean; message_changed boolean;
  modules_changed boolean; status_permission text; allowed_modules text[] := array[
    'member_registration','technical_access','contributions','shares','loan_requests','loan_approvals','loan_repayments',
    'social_fund','profit_distribution','expenses','reconciliation','savings_cycles','meetings','announcements','chat'
  ]; normalized_modules text[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (
    public.has_group_permission(target_group,'system:configure')
    or public.has_group_permission(target_group,'system:maintenance')
    or public.has_group_permission(target_group,'system:lock')
    or public.has_group_permission(target_group,'system:modules')
    or public.has_group_permission(target_group,'system:monitor')
    or public.has_group_permission(target_group,'support:manage')
    or public.has_group_permission(target_group,'security:manage')
    or public.has_group_permission(target_group,'security:audit')
  ) then raise exception 'Technical access to this Ikimina is required'; end if;
  if target_status is null or target_status not in ('normal','limited','maintenance','locked')
     or char_length(coalesce(target_message,'')) > 500 or target_disabled_modules is null
     or cardinality(target_disabled_modules) > cardinality(allowed_modules)
     or exists(select 1 from unnest(target_disabled_modules) as item(module_name) where item.module_name is null or not (item.module_name = any(allowed_modules))) then
    raise exception 'Invalid group system-control settings';
  end if;
  select coalesce(array_agg(distinct module_name order by module_name), '{}'::text[])
    into normalized_modules from unnest(target_disabled_modules) as item(module_name);
  select * into current_row from public.group_system_controls where group_id=target_group for update;
  status_changed := coalesce(current_row.status,'normal') is distinct from target_status;
  message_changed := current_row.message is distinct from nullif(btrim(target_message),'');
  modules_changed := coalesce(current_row.disabled_modules,'{}'::text[]) is distinct from normalized_modules;
  if not status_changed and not message_changed and not modules_changed then
    return jsonb_build_object('saved',true,'changed',false,'group_id',target_group);
  end if;
  if status_changed then
    if target_status='locked' or current_row.status='locked' then status_permission := 'system:lock';
    elsif target_status in ('limited','maintenance') or current_row.status in ('limited','maintenance') then status_permission := 'system:maintenance';
    else status_permission := 'system:configure'; end if;
    if not public.has_group_permission(target_group,status_permission) then raise exception 'The matching permission is required to change this group operating state'; end if;
  end if;
  if message_changed and not public.has_group_permission(target_group,'system:configure') then
    raise exception 'System configuration permission is required to change the status message';
  end if;
  if modules_changed and not public.has_group_permission(target_group,'system:modules') then
    raise exception 'Module-control permission is required to change module availability';
  end if;

  insert into public.group_system_controls(group_id,status,message,disabled_modules,changed_by,updated_at)
  values(target_group,target_status,nullif(btrim(target_message),''),normalized_modules,auth.uid(),now())
  on conflict(group_id) do update set status=excluded.status,message=excluded.message,
    disabled_modules=excluded.disabled_modules,changed_by=excluded.changed_by,updated_at=excluded.updated_at;
  return jsonb_build_object('saved',true,'changed',true,'group_id',target_group,'status',target_status,'disabled_modules',normalized_modules);
end;
$$;
revoke all on function public.set_group_system_controls(uuid,text,text,text[]) from public, anon;
grant execute on function public.set_group_system_controls(uuid,text,text,text[]) to authenticated;

-- Staff roles can only be granted to an existing active member. Technical
-- roles remain independently assignable to verified non-members.
create or replace function public.assign_group_role(target_group uuid, target_email text, target_role text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_user uuid; actor_roles text[]; normalized text := lower(btrim(target_email));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_group_permission(target_group, 'roles:manage') then raise exception 'Role management permission required'; end if;
  if target_role not in ('committee_member','group_administrator','treasurer','secretary','system_administrator','technician','security_administrator','super_administrator') then
    raise exception 'This role cannot be assigned through standard role management';
  end if;
  actor_roles := public.current_group_roles(target_group);
  if target_role = 'super_administrator' and not ('super_administrator' = any(actor_roles)) then
    raise exception 'Super-administrator access can only be granted by a super administrator';
  end if;
  if target_role in ('system_administrator','technician','security_administrator')
     and not ('system_administrator' = any(actor_roles) or 'super_administrator' = any(actor_roles)) then
    raise exception 'Technical roles can only be assigned by a system administrator';
  end if;
  select p.id into target_user from public.profiles p
  where p.normalized_email = normalized and public.account_email_is_verified(p.id) limit 1;
  if target_user is null then raise exception 'No verified registered account matches that email'; end if;
  if target_user = auth.uid() then raise exception 'You cannot assign roles to your own account'; end if;
  if target_role not in ('system_administrator','technician','security_administrator','super_administrator')
     and not exists (
       select 1 from public.members m
       where m.group_id = target_group and m.user_id = target_user and m.status = 'active'
     ) then
    raise exception 'Group staff roles can only be assigned to an active Member';
  end if;
  insert into public.group_role_assignments(group_id,user_id,role_key,user_email,granted_by)
  values(target_group,target_user,target_role,normalized,auth.uid()) on conflict(group_id,user_id,role_key) do nothing;
  return target_user;
end;
$$;

-- The RPC evaluates each changed field independently; callers cannot bypass
-- its granular permission checks with direct table updates.
revoke insert, update, delete on public.group_system_controls from authenticated;
revoke insert (group_id) on public.group_system_controls from authenticated;
revoke update (status,message,disabled_modules,changed_by,updated_at) on public.group_system_controls from authenticated;
grant select on public.group_system_controls to authenticated;

drop policy if exists system_controls_read on public.group_system_controls;
create policy system_controls_read on public.group_system_controls for select to authenticated using (
  public.is_group_member(group_id)
  or public.has_group_permission(group_id,'system:configure')
  or public.has_group_permission(group_id,'system:maintenance')
  or public.has_group_permission(group_id,'system:lock')
  or public.has_group_permission(group_id,'system:modules')
  or public.has_group_permission(group_id,'system:monitor')
  or public.has_group_permission(group_id,'support:manage')
  or public.has_group_permission(group_id,'security:manage')
  or public.has_group_permission(group_id,'security:audit')
);
drop policy if exists system_controls_manage on public.group_system_controls;
create policy system_controls_manage on public.group_system_controls for all to authenticated
using (public.has_group_permission(group_id,'system:configure') or public.has_group_permission(group_id,'system:maintenance') or public.has_group_permission(group_id,'system:lock') or public.has_group_permission(group_id,'system:modules'))
with check (public.has_group_permission(group_id,'system:configure') or public.has_group_permission(group_id,'system:maintenance') or public.has_group_permission(group_id,'system:lock') or public.has_group_permission(group_id,'system:modules'));

create or replace function public.enforce_group_module_availability(target_group uuid,target_module text)
returns void language plpgsql stable security definer set search_path = '' as $$
declare control_row public.group_system_controls%rowtype;
begin
  select * into control_row from public.group_system_controls where group_id=target_group;
  if control_row.status in ('maintenance','locked') then
    raise exception 'This Ikimina is in % mode; new operations are temporarily unavailable',control_row.status;
  end if;
  if target_module = any(coalesce(control_row.disabled_modules,'{}'::text[])) then
    raise exception 'This Ikimina has temporarily paused the % module',replace(target_module,'_',' ');
  end if;
end;
$$;
revoke all on function public.enforce_group_module_availability(uuid,text) from public, anon, authenticated;

create or replace function public.enforce_group_module_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_group uuid; target_module text; before_row jsonb; after_row jsonb;
begin
  before_row := case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
  after_row := case when tg_op='DELETE' then '{}'::jsonb else to_jsonb(new) end;
  if tg_table_name in ('chat_messages','chat_threads','chat_thread_members') then
    if tg_table_name='chat_threads' then
      target_group := coalesce(nullif(after_row->>'group_id','')::uuid,nullif(before_row->>'group_id','')::uuid);
    else
      select t.group_id into target_group from public.chat_threads t
      where t.id=coalesce(nullif(after_row->>'thread_id','')::uuid,nullif(before_row->>'thread_id','')::uuid);
    end if;
    target_module := 'chat';
  elsif tg_table_name in ('meeting_decisions','meeting_documents','meeting_votes') then
    select m.group_id into target_group
    from public.meetings m
    where m.id=coalesce((after_row->>'meeting_id')::uuid,(before_row->>'meeting_id')::uuid)
       or m.id in (select d.meeting_id from public.meeting_decisions d where d.id=coalesce((after_row->>'decision_id')::uuid,(before_row->>'decision_id')::uuid));
    target_module := 'meetings';
  else
    target_group := coalesce(nullif(after_row->>'group_id','')::uuid,nullif(before_row->>'group_id','')::uuid);
    target_module := case tg_table_name
      when 'members' then 'member_registration'
      when 'join_requests' then 'member_registration'
      when 'group_invitations' then 'member_registration'
      when 'group_role_assignments' then 'technical_access'
      when 'contributions' then 'contributions'
      when 'contribution_obligations' then 'contributions'
      when 'share_transactions' then 'shares'
      when 'loans' then case
        when before_row->>'status'='pending' and after_row->>'status' in ('approved','rejected','active') then 'loan_approvals'
        when coalesce(nullif(after_row->>'outstanding_amount','')::numeric,0) < coalesce(nullif(before_row->>'outstanding_amount','')::numeric,0)
          or coalesce(nullif(after_row->>'outstanding_interest','')::numeric,0) < coalesce(nullif(before_row->>'outstanding_interest','')::numeric,0) then 'loan_repayments'
        else 'loan_requests' end
      when 'loan_repayments' then 'loan_repayments'
      when 'social_fund_requests' then 'social_fund'
      when 'expenses' then 'expenses'
      when 'bank_transactions' then 'reconciliation'
      when 'group_cycles' then 'savings_cycles'
      when 'cycle_members' then 'savings_cycles'
      when 'group_announcements' then 'announcements'
      when 'meetings' then 'meetings'
      else null
    end;
  end if;
  if target_group is not null and target_module is not null then
    perform public.enforce_group_module_availability(target_group,target_module);
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.enforce_group_module_write() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'members','join_requests','group_invitations','group_role_assignments','contributions','share_transactions',
    'contribution_obligations','loans','loan_repayments','social_fund_requests','expenses','bank_transactions','group_cycles','cycle_members',
    'group_announcements','chat_threads','chat_thread_members','chat_messages','meetings','meeting_decisions','meeting_documents','meeting_votes'
  ] loop
    execute format('drop trigger if exists enforce_group_module_availability on public.%I',table_name);
    execute format('create trigger enforce_group_module_availability before insert or update or delete on public.%I for each row execute function public.enforce_group_module_write()',table_name);
  end loop;
end $$;
