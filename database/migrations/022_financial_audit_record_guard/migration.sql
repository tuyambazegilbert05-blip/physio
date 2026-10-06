-- A shared audit trigger can run for groups, loans, and role assignments.
-- Access OLD-only fields only after narrowing to the matching DELETE event;
-- otherwise inserts into unrelated tables can raise "record old has no field".
create or replace function public.write_financial_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  row_data jsonb;
  before_row jsonb;
  after_row jsonb;
  group_key uuid;
  row_id text;
  actor uuid;
  used_permission text;
  actor_roles text[];
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
  actor_roles := case
    when group_key is null then '{}'::text[]
    else public.current_group_roles(group_key)
  end;
  if tg_table_name = 'group_role_assignments' and tg_op = 'DELETE' then
    if old.user_id = actor then
      actor_roles := array_append(actor_roles, old.role_key);
    end if;
  end if;
  if group_key is not null and public.is_group_member(group_key) then
    actor_roles := array_append(actor_roles, 'member');
  end if;
  used_permission := null;
  if tg_table_name = 'members' then
    used_permission := 'members:manage';
  elsif tg_table_name = 'contributions' then
    used_permission := case when tg_op = 'UPDATE' then 'contributions:verify' else 'contributions:record' end;
  elsif tg_table_name = 'loans' then
    if tg_op = 'UPDATE' then
      if old.status = 'active' and new.status = 'repaid' then
        used_permission := 'repayments:record';
      elsif old.status = 'pending' then
        used_permission := 'loans:approve';
      else
        used_permission := 'loans:disburse';
      end if;
    else
      used_permission := 'loans:apply';
    end if;
  elsif tg_table_name = 'groups' then
    used_permission := 'groups:manage';
  elsif tg_table_name in ('meetings', 'attendance') then
    used_permission := 'meetings:manage';
  elsif tg_table_name = 'group_role_assignments' then
    used_permission := 'roles:manage';
  end if;
  insert into public.audit_logs(
    group_id, actor_id, action, entity, entity_id, permission_used,
    authority_roles, before_data, after_data
  )
  values (
    group_key, actor, lower(tg_op), tg_table_name, row_id, used_permission,
    actor_roles, before_row, after_row
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
