-- Persist a single, resumable onboarding flow for every active membership.
-- Invitation and approved-join memberships enter the same state through the
-- member activation trigger below.

alter table public.profiles add column if not exists phone text;

create table if not exists public.group_membership_terms (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  version integer not null check (version > 0),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  body text not null check (char_length(btrim(body)) between 10 and 12000),
  is_required boolean not null default true,
  is_current boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (group_id, version)
);
create unique index if not exists group_membership_terms_one_current_idx
  on public.group_membership_terms(group_id) where is_current;

create table if not exists public.group_member_fields (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 500),
  field_type text not null check (field_type in ('text', 'textarea', 'number', 'date', 'phone', 'select', 'radio', 'checkbox')),
  is_required boolean not null default false,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  is_active boolean not null default true,
  display_order integer not null default 0 check (display_order between 0 and 1000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, id)
);
create index if not exists group_member_fields_active_order_idx
  on public.group_member_fields(group_id, display_order, created_at) where is_active;

drop trigger if exists group_member_fields_set_updated_at on public.group_member_fields;
create trigger group_member_fields_set_updated_at before update on public.group_member_fields
for each row execute function public.set_updated_at();

create table if not exists public.member_onboarding (
  member_id uuid primary key,
  group_id uuid not null,
  group_information_viewed_at timestamptz,
  terms_completed_version integer,
  accepted_terms_version integer,
  terms_accepted_at timestamptz,
  field_responses jsonb not null default '{}'::jsonb check (jsonb_typeof(field_responses) = 'object'),
  fields_completed_at timestamptz,
  share_selection_cycle_id uuid references public.group_cycles(id) on delete set null,
  selected_share_units numeric(12,2) check (selected_share_units is null or selected_share_units >= 0),
  share_transaction_id uuid references public.share_transactions(id) on delete set null,
  contribution_ack_cycle_id uuid references public.group_cycles(id) on delete set null,
  contribution_ack_amount numeric(15,0),
  contribution_ack_frequency text,
  contribution_ack_social_amount numeric(15,0),
  contribution_acknowledged_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (group_id, member_id) references public.members(group_id, id) on delete cascade
);
create index if not exists member_onboarding_group_idx on public.member_onboarding(group_id, completed_at);
drop trigger if exists member_onboarding_set_updated_at on public.member_onboarding;
create trigger member_onboarding_set_updated_at before update on public.member_onboarding
for each row execute function public.set_updated_at();

alter table public.group_membership_terms enable row level security;
alter table public.group_member_fields enable row level security;
alter table public.member_onboarding enable row level security;
revoke all on public.group_membership_terms, public.group_member_fields, public.member_onboarding from public, anon, authenticated;
grant all on public.group_membership_terms, public.group_member_fields, public.member_onboarding to service_role;

create or replace function public.initialize_member_onboarding()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' then
    insert into public.member_onboarding(member_id, group_id)
    values (new.id, new.group_id)
    on conflict (member_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.initialize_member_onboarding() from public, anon, authenticated;
drop trigger if exists members_initialize_onboarding on public.members;
create trigger members_initialize_onboarding after insert or update of status on public.members
for each row execute function public.initialize_member_onboarding();

create or replace function public.notify_membership_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid; group_name text;
begin
  select g.name into group_name from public.groups g where g.id = new.group_id;
  if tg_op = 'INSERT' then
    for recipient in
      select distinct assignment.user_id
      from public.group_role_assignments assignment
      join public.role_permissions permission on permission.role_key = assignment.role_key
      where assignment.group_id = new.group_id
        and permission.permission_key = 'membership:requests_review'
        and assignment.user_id <> new.user_id
    loop
      insert into public.notifications(user_id,title,body,href)
      values(recipient,'Membership request received','A person requested to join '||group_name||'.','/dashboard/membership-requests?group='||new.group_id::text);
    end loop;
    return new;
  end if;
  if old.status is distinct from new.status and new.status in ('approved','rejected') then
    insert into public.notifications(user_id,title,body,href)
    values(new.user_id,
      case when new.status='approved' then 'Your membership was approved' else 'Membership request update' end,
      case when new.status='approved' then 'Your request to join '||group_name||' was approved. Complete group onboarding to open your Member space.'
        else 'Your request to join '||group_name||' was not approved.' end
        || case when new.decision_message is null then '' else ' '||new.decision_message end,
      case when new.status='approved' then '/dashboard/onboarding?group='||new.group_id::text else '/dashboard/join' end);
  end if;
  return new;
end;
$$;
revoke all on function public.notify_membership_request() from public, anon, authenticated;

insert into public.member_onboarding(member_id, group_id)
select m.id, m.group_id from public.members m where m.status = 'active'
on conflict (member_id) do nothing;

create or replace function public.sync_member_profile_phone()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null and new.phone is null then
    update public.members m set phone = p.phone
    from public.profiles p
    where m.id = new.id and p.id = new.user_id and p.phone is not null;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_member_profile_phone() from public, anon, authenticated;
drop trigger if exists members_sync_profile_phone on public.members;
create trigger members_sync_profile_phone after insert or update of user_id on public.members
for each row execute function public.sync_member_profile_phone();

create or replace function public.member_onboarding_values_valid(target_group uuid, target_values jsonb)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare field_row record; item record; field_value jsonb; string_value text;
begin
  if target_values is null or jsonb_typeof(target_values) <> 'object' then return false; end if;
  for item in select key, value from jsonb_each(target_values) loop
    begin
      select f.* into field_row from public.group_member_fields f
      where f.id = item.key::uuid and f.group_id = target_group and f.is_active;
    exception when invalid_text_representation then return false;
    end;
    if field_row.id is null then return false; end if;
  end loop;

  for field_row in select * from public.group_member_fields f where f.group_id = target_group and f.is_active loop
    field_value := target_values -> field_row.id::text;
    if field_value is null or field_value = 'null'::jsonb or
       (jsonb_typeof(field_value) = 'string' and btrim(field_value #>> '{}') = '') then
      if field_row.is_required then return false; end if;
      continue;
    end if;
    string_value := field_value #>> '{}';
    case field_row.field_type
      when 'text' then
        if jsonb_typeof(field_value) <> 'string' or char_length(string_value) > 2000 then return false; end if;
      when 'textarea' then
        if jsonb_typeof(field_value) <> 'string' or char_length(string_value) > 12000 then return false; end if;
      when 'number' then
        if jsonb_typeof(field_value) not in ('number', 'string') or string_value !~ '^-?[0-9]+(\.[0-9]{1,4})?$' then return false; end if;
      when 'date' then
        if jsonb_typeof(field_value) <> 'string' or string_value !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
        begin perform string_value::date; exception when others then return false; end;
      when 'phone' then
        if jsonb_typeof(field_value) <> 'string' or string_value !~ '^\+?[0-9][0-9 ()\-.]{5,23}$' then return false; end if;
      when 'select', 'radio' then
        if jsonb_typeof(field_value) <> 'string' or not exists (
          select 1 from jsonb_array_elements_text(field_row.options) as option_value(value) where option_value.value = string_value
        ) then return false; end if;
      when 'checkbox' then
        if jsonb_typeof(field_value) <> 'boolean' or (field_row.is_required and field_value <> 'true'::jsonb) then return false; end if;
      else return false;
    end case;
  end loop;
  return true;
end;
$$;
revoke all on function public.member_onboarding_values_valid(uuid, jsonb) from public, anon, authenticated;

create or replace function public.member_onboarding_is_complete(target_group uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare member_row public.members%rowtype; onboarding_row public.member_onboarding%rowtype;
  terms_version integer; has_terms boolean; cycle_row public.group_cycles%rowtype;
  group_row public.groups%rowtype; social_amount numeric := 0; share_config jsonb;
  min_units numeric := 0; max_units numeric; required_units numeric := 0;
begin
  if auth.uid() is null then return false; end if;
  select * into member_row from public.members m
  where m.group_id = target_group and m.user_id = auth.uid() and m.status = 'active';
  if member_row.id is null then return false; end if;
  select * into onboarding_row from public.member_onboarding o where o.member_id = member_row.id;
  if onboarding_row.member_id is null or onboarding_row.completed_at is null
     or onboarding_row.group_information_viewed_at is null then return false; end if;

  select t.version into terms_version from public.group_membership_terms t
  where t.group_id = target_group and t.is_current;
  has_terms := found;
  if has_terms and onboarding_row.terms_completed_version is distinct from terms_version then return false; end if;
  if has_terms and exists (select 1 from public.group_membership_terms t
      where t.group_id = target_group and t.is_current and t.is_required)
     and onboarding_row.accepted_terms_version is distinct from terms_version then return false; end if;

  if exists (select 1 from public.group_member_fields f where f.group_id = target_group and f.is_active) then
    if onboarding_row.fields_completed_at is null
       or not public.member_onboarding_values_valid(target_group, onboarding_row.field_responses)
       or exists (select 1 from public.group_member_fields f where f.group_id = target_group and f.is_active
          and not (onboarding_row.field_responses ? f.id::text)) then return false; end if;
  end if;

  select * into group_row from public.groups g where g.id = target_group;
  select * into cycle_row from public.group_cycles c where c.group_id = target_group and c.status = 'open';
  if cycle_row.id is not null then
    social_amount := coalesce(nullif(cycle_row.rules ->> 'social_contribution_amount', '')::numeric, 0);
    share_config := coalesce(cycle_row.rules -> 'member_share_selection', '{}'::jsonb);
    if coalesce((share_config ->> 'enabled')::boolean, false) then
      min_units := coalesce(nullif(share_config ->> 'min_units', '')::numeric, 1);
      max_units := nullif(share_config ->> 'max_units', '')::numeric;
      required_units := coalesce(nullif(share_config ->> 'required_units', '')::numeric, min_units);
      if onboarding_row.share_selection_cycle_id is distinct from cycle_row.id
         or onboarding_row.selected_share_units is null
         or onboarding_row.selected_share_units < min_units
         or (max_units is not null and onboarding_row.selected_share_units > max_units)
         or onboarding_row.selected_share_units < required_units
         or onboarding_row.share_transaction_id is null
         or not exists (
           select 1 from public.share_transactions s
           where s.id = onboarding_row.share_transaction_id and s.group_id = target_group
             and s.member_id = member_row.id and s.cycle_id = cycle_row.id
             and s.direction = 'purchase' and s.status in ('pending','verified')
         ) then return false; end if;
    end if;
  end if;
  if onboarding_row.contribution_ack_cycle_id is distinct from cycle_row.id
     or onboarding_row.contribution_ack_amount is distinct from coalesce(cycle_row.contribution_amount, group_row.contribution_amount)
     or onboarding_row.contribution_ack_frequency is distinct from group_row.contribution_frequency
     or onboarding_row.contribution_ack_social_amount is distinct from social_amount
     or onboarding_row.contribution_acknowledged_at is null then return false; end if;
  return true;
end;
$$;
revoke all on function public.member_onboarding_is_complete(uuid) from public, anon;
grant execute on function public.member_onboarding_is_complete(uuid) to authenticated;

create or replace function public.save_group_onboarding_config(
  target_group uuid,
  target_terms_title text,
  target_terms_body text,
  target_terms_required boolean,
  target_fields jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_terms public.group_membership_terms%rowtype; next_version integer; field_item jsonb;
  field_id uuid; field_label text; field_kind text; field_options jsonb; field_required boolean;
  field_active boolean; field_order integer; keep_ids uuid[] := '{}'::uuid[]; created_id uuid;
  existing_field public.group_member_fields%rowtype; changed_terms boolean := false; fields_changed boolean := false; changed_count integer := 0;
  terms_title text := btrim(coalesce(target_terms_title, ''));
  terms_body text := btrim(coalesce(target_terms_body, ''));
begin
  if auth.uid() is null or not public.has_group_permission(target_group, 'groups:manage') then
    raise exception 'Group management permission required';
  end if;
  if jsonb_typeof(target_fields) <> 'array' or jsonb_array_length(target_fields) > 30 then
    raise exception 'Member fields must be a list of at most 30 fields';
  end if;
  if (terms_title = '') <> (terms_body = '') or char_length(terms_title) > 160 or char_length(terms_body) > 12000
      or (terms_body <> '' and (char_length(terms_title) < 2 or char_length(terms_body) < 10)) then
    raise exception 'Enter a title and group requirements between 10 and 12000 characters';
  end if;
  select * into current_terms from public.group_membership_terms t
  where t.group_id = target_group and t.is_current for update;
  if terms_body = '' then
    if current_terms.id is not null then
      update public.group_membership_terms set is_current = false where id = current_terms.id;
      changed_terms := true;
    end if;
  elsif current_terms.id is null or current_terms.title is distinct from terms_title
      or current_terms.body is distinct from terms_body or current_terms.is_required is distinct from target_terms_required then
    update public.group_membership_terms set is_current = false where group_id = target_group and is_current;
    select coalesce(max(t.version), 0) + 1 into next_version from public.group_membership_terms t where t.group_id = target_group;
    insert into public.group_membership_terms(group_id, version, title, body, is_required, created_by)
    values (target_group, next_version, terms_title, terms_body, coalesce(target_terms_required, true), auth.uid());
    changed_terms := true;
  end if;

  for field_item in select value from jsonb_array_elements(target_fields) loop
    field_id := null;
    if nullif(field_item ->> 'id', '') is not null then
      begin field_id := (field_item ->> 'id')::uuid;
      exception when invalid_text_representation then raise exception 'A member field identifier is invalid'; end;
    end if;
    field_label := btrim(coalesce(field_item ->> 'label', ''));
    field_kind := field_item ->> 'type';
    field_required := coalesce((field_item ->> 'required')::boolean, false);
    field_active := coalesce((field_item ->> 'active')::boolean, true);
    field_order := coalesce((field_item ->> 'order')::integer, 0);
    field_options := coalesce(field_item -> 'options', '[]'::jsonb);
    if char_length(field_label) not between 2 and 120 or char_length(coalesce(field_item ->> 'description', '')) > 500
       or field_kind not in ('text','textarea','number','date','phone','select','radio','checkbox')
       or jsonb_typeof(field_options) <> 'array' or field_order not between 0 and 1000 then
      raise exception 'A member field has invalid settings';
    end if;
    if field_kind in ('select','radio') then
      if jsonb_array_length(field_options) not between 1 and 50
         or exists (select 1 from jsonb_array_elements(field_options) as option_item(value) where jsonb_typeof(option_item.value) <> 'string' or char_length(btrim(option_item.value #>> '{}')) not between 1 and 120) then
        raise exception 'Select and radio fields need 1 to 50 valid choices';
      end if;
    else
      field_options := '[]'::jsonb;
    end if;
    if field_id is null then
      insert into public.group_member_fields(group_id,label,description,field_type,is_required,options,is_active,display_order,created_by)
      values (target_group,field_label,coalesce(field_item ->> 'description',''),field_kind,field_required,field_options,field_active,field_order,auth.uid())
      returning id into created_id;
      keep_ids := array_append(keep_ids, created_id);
      fields_changed := true;
    else
      select * into existing_field from public.group_member_fields where id = field_id and group_id = target_group;
      if not found then raise exception 'A member field does not belong to this Ikimina'; end if;
      if existing_field.label is distinct from field_label
         or existing_field.description is distinct from coalesce(field_item ->> 'description','')
         or existing_field.field_type is distinct from field_kind
         or existing_field.is_required is distinct from field_required
         or existing_field.options is distinct from field_options
         or existing_field.is_active is distinct from field_active
         or existing_field.display_order is distinct from field_order then fields_changed := true; end if;
      update public.group_member_fields set label = field_label,description = coalesce(field_item ->> 'description',''),
        field_type = field_kind,is_required = field_required,options = field_options,is_active = field_active,display_order = field_order
      where id = field_id and group_id = target_group;
      keep_ids := array_append(keep_ids, field_id);
    end if;
  end loop;
  update public.group_member_fields set is_active = false
  where group_id = target_group and is_active and not (id = any(keep_ids));
  get diagnostics changed_count = row_count;
  if changed_count > 0 then fields_changed := true; end if;
  if fields_changed then
    update public.member_onboarding set fields_completed_at = null where group_id = target_group;
  end if;

  insert into public.audit_logs(group_id,actor_id,action,entity,details,permission_used,authority_roles)
  values (target_group,auth.uid(),'GROUP_ONBOARDING_CONFIG_UPDATED','group_member_fields',
    jsonb_build_object('field_count',jsonb_array_length(target_fields),'terms_changed',changed_terms),
    'groups:manage',public.current_group_roles(target_group));
  return jsonb_build_object('saved',true,'terms_changed',changed_terms,'fields_changed',fields_changed);
end;
$$;
revoke all on function public.save_group_onboarding_config(uuid,text,text,boolean,jsonb) from public, anon;
grant execute on function public.save_group_onboarding_config(uuid,text,text,boolean,jsonb) to authenticated;

create or replace function public.save_member_onboarding_step(target_group uuid, target_step text, target_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare member_row public.members%rowtype; state public.member_onboarding%rowtype;
  terms public.group_membership_terms%rowtype; cycle_row public.group_cycles%rowtype; group_row public.groups%rowtype;
  share_config jsonb; share_units numeric; minimum_units numeric; maximum_units numeric; required_units numeric;
  social_amount numeric := 0; transaction_id uuid; share_status text; result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_step not in ('group_information','rules','member_information','shares','contributions','complete')
      or target_payload is null or jsonb_typeof(target_payload) <> 'object' then raise exception 'Invalid onboarding step'; end if;
  select * into member_row from public.members m
  where m.group_id = target_group and m.user_id = auth.uid() and m.status = 'active' for update;
  if member_row.id is null then raise exception 'An active membership is required'; end if;
  insert into public.member_onboarding(member_id,group_id) values(member_row.id,target_group) on conflict(member_id) do nothing;
  select * into state from public.member_onboarding o where o.member_id = member_row.id for update;
  select * into group_row from public.groups g where g.id = target_group;
  select * into cycle_row from public.group_cycles c where c.group_id = target_group and c.status = 'open';
  if cycle_row.id is not null then social_amount := coalesce(nullif(cycle_row.rules ->> 'social_contribution_amount','')::numeric,0); end if;

  if target_step = 'group_information' then
    update public.member_onboarding set group_information_viewed_at = now() where member_id = member_row.id;
  elsif target_step = 'rules' then
    select * into terms from public.group_membership_terms t where t.group_id = target_group and t.is_current;
    if terms.id is null then raise exception 'There are no current group rules to accept'; end if;
    if terms.is_required and coalesce((target_payload ->> 'accepted')::boolean,false) is not true then
      raise exception 'Accept the required group rules before continuing';
    end if;
    update public.member_onboarding set terms_completed_version = terms.version,
      accepted_terms_version = case when coalesce((target_payload ->> 'accepted')::boolean,false) then terms.version else null end,
      terms_accepted_at = case when coalesce((target_payload ->> 'accepted')::boolean,false) then now() else null end
    where member_id = member_row.id;
  elsif target_step = 'member_information' then
    if not public.member_onboarding_values_valid(target_group, target_payload -> 'values') then
      raise exception 'Complete the required member information using valid values';
    end if;
    update public.member_onboarding set field_responses = target_payload -> 'values', fields_completed_at = now()
    where member_id = member_row.id;
  elsif target_step = 'shares' then
    share_config := coalesce(cycle_row.rules -> 'member_share_selection','{}'::jsonb);
    if cycle_row.id is null or not coalesce((share_config ->> 'enabled')::boolean,false) or cycle_row.share_price <= 0 then
      raise exception 'Share selection is not configured for this Ikimina cycle';
    end if;
    begin share_units := (target_payload ->> 'units')::numeric;
    exception when others then raise exception 'Enter a valid number of shares'; end;
    minimum_units := coalesce(nullif(share_config ->> 'min_units','')::numeric,1);
    maximum_units := nullif(share_config ->> 'max_units','')::numeric;
    required_units := coalesce(nullif(share_config ->> 'required_units','')::numeric,minimum_units);
    if share_units < minimum_units or (maximum_units is not null and share_units > maximum_units)
       or share_units < required_units or share_units > 1000000 then raise exception 'The selected share quantity is outside this group’s allowed range'; end if;
    if state.share_transaction_id is not null then
      select s.id,s.status into transaction_id, share_status from public.share_transactions s
      where s.id = state.share_transaction_id for update;
      if share_status not in ('pending','verified') then raise exception 'This share request cannot be changed'; end if;
      if share_status = 'verified' and state.selected_share_units is distinct from share_units then
        raise exception 'Verified share purchases cannot be changed here';
      end if;
      if share_status = 'pending' then
        update public.share_transactions set units = share_units,unit_price = cycle_row.share_price
        where id = state.share_transaction_id;
      end if;
    else
      insert into public.share_transactions(group_id,cycle_id,member_id,direction,units,unit_price,status,created_by)
      values(target_group,cycle_row.id,member_row.id,'purchase',share_units,cycle_row.share_price,'pending',auth.uid())
      returning id into transaction_id;
    end if;
    update public.member_onboarding set share_selection_cycle_id = cycle_row.id,
      selected_share_units = share_units,share_transaction_id = transaction_id where member_id = member_row.id;
  elsif target_step = 'contributions' then
    if coalesce((target_payload ->> 'acknowledged')::boolean,false) is not true then
      raise exception 'Confirm that you understand the configured contribution amounts';
    end if;
    update public.member_onboarding set contribution_ack_cycle_id = cycle_row.id,
      contribution_ack_amount = coalesce(cycle_row.contribution_amount,group_row.contribution_amount),
      contribution_ack_frequency = group_row.contribution_frequency,
      contribution_ack_social_amount = social_amount,contribution_acknowledged_at = now()
    where member_id = member_row.id;
  else
    update public.member_onboarding set completed_at = now() where member_id = member_row.id;
    if not public.member_onboarding_is_complete(target_group) then
      raise exception 'Finish each required onboarding step before opening your Member space';
    end if;
    result := jsonb_build_object('completed',true,'group_id',target_group);
    return result;
  end if;

  return jsonb_build_object('completed',false,'group_id',target_group);
end;
$$;
revoke all on function public.save_member_onboarding_step(uuid,text,jsonb) from public, anon;
grant execute on function public.save_member_onboarding_step(uuid,text,jsonb) to authenticated;

-- Phone number is part of the app-owned profile and is saved atomically with
-- the account and session. Drop the older overload so callers cannot omit it.
drop function if exists public.create_application_account(uuid,text,text,text,text,timestamptz,text,text,boolean);
create or replace function public.create_application_account(
  target_user uuid,
  target_email text,
  target_full_name text,
  target_phone text,
  target_password_hash text,
  target_session_hash text,
  target_session_expiry timestamptz,
  target_ip text,
  target_user_agent text,
  email_is_preverified boolean default false
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare normalized text := lower(btrim(target_email)); now_at timestamptz := pg_catalog.clock_timestamp(); normalized_phone text := regexp_replace(btrim(coalesce(target_phone,'')), '[[:space:]().-]', '', 'g');
begin
  if target_user is null or target_password_hash is null or char_length(target_password_hash) > 256
     or target_session_hash is null or target_session_hash !~ '^[0-9a-f]{64}$'
     or normalized is null or char_length(normalized) not between 3 and 254
     or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     or target_full_name is null or char_length(btrim(target_full_name)) not between 2 and 120
     or normalized_phone !~ '^\+?[0-9][0-9]{6,19}$'
     or target_session_expiry <= now_at then raise exception 'Invalid account registration'; end if;
  insert into public.profiles(id,full_name,phone,email,normalized_email,email_verified_at,account_status)
  values(target_user,btrim(target_full_name),normalized_phone,normalized,normalized,
    case when email_is_preverified then now_at else null end,
    case when email_is_preverified then 'active' else 'pending_verification' end);
  insert into public.app_password_credentials(user_id,password_hash,password_changed_at)
  values(target_user,target_password_hash,now_at);
  insert into public.app_sessions(user_id,token_hash,expires_at,ip_address,user_agent)
  values(target_user,target_session_hash,target_session_expiry,left(target_ip,64),left(target_user_agent,512));
  if email_is_preverified then
    insert into public.account_email_verifications(user_id,verified_email,verified_at)
    values(target_user,normalized,now_at)
    on conflict(user_id) do update set verified_email=excluded.verified_email,verified_at=excluded.verified_at;
  end if;
  return target_user;
end;
$$;
revoke all on function public.create_application_account(uuid,text,text,text,text,text,timestamptz,text,text,boolean) from public, anon, authenticated;
grant execute on function public.create_application_account(uuid,text,text,text,text,text,timestamptz,text,text,boolean) to service_role;

create or replace function public.activate_group_invitation_for_user(target_token_hash text, target_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare invite public.group_invitations%rowtype; account public.profiles%rowtype; group_name text;
  member_row public.members%rowtype; member_id uuid; now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if target_user is null or target_token_hash is null or target_token_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('status','invalid'); end if;
  select * into invite from public.group_invitations where token_hash=target_token_hash for update;
  if invite.id is null then return jsonb_build_object('status','invalid'); end if;
  if invite.status='accepted' then
    if invite.invitee_user_id=target_user then return jsonb_build_object('status','accepted','group_id',invite.group_id); end if;
    return jsonb_build_object('status','invalid');
  end if;
  if invite.status='declined' then return jsonb_build_object('status','declined'); end if;
  if invite.status='revoked' then return jsonb_build_object('status','revoked'); end if;
  if invite.status='expired' or invite.expires_at<=now_at then
    if invite.status<>'expired' then update public.group_invitations set status='expired' where id=invite.id; end if;
    return jsonb_build_object('status','expired');
  end if;
  if invite.status not in ('pending','sent','delivery_failed') then return jsonb_build_object('status','invalid'); end if;
  select * into account from public.profiles p where p.id=target_user and p.account_status in ('active','pending_verification');
  if account.id is null then return jsonb_build_object('status','account_unverified'); end if;
  if account.normalized_email is distinct from invite.email then return jsonb_build_object('status','email_mismatch'); end if;
  select g.name into group_name from public.groups g where g.id=invite.group_id for update;
  if group_name is null or exists(select 1 from public.group_system_controls c where c.group_id=invite.group_id and c.status in ('locked','maintenance')) then
    update public.group_invitations set status='revoked',revoked_at=now_at where id=invite.id;
    return jsonb_build_object('status','unavailable');
  end if;
  select * into member_row from public.members m where m.group_id=invite.group_id and m.user_id=target_user for update;
  if member_row.id is null then
    select * into member_row from public.members m where m.group_id=invite.group_id and lower(btrim(coalesce(m.email,'')))=invite.email for update;
  end if;
  if member_row.id is not null then
    if member_row.status<>'active' or (member_row.user_id is not null and member_row.user_id<>target_user) then
      return jsonb_build_object('status','membership_blocked');
    end if;
    if member_row.user_id is null then
      update public.members set user_id=target_user,full_name=account.full_name,email=account.email,phone=coalesce(phone,account.phone)
      where id=member_row.id returning id into member_id;
    else member_id:=member_row.id; end if;
  else
    insert into public.members(group_id,user_id,full_name,email,phone,status)
    values(invite.group_id,target_user,account.full_name,account.email,account.phone,'active') returning id into member_id;
  end if;
  update public.profiles set email_verified_at=coalesce(email_verified_at,now_at),account_status='active' where id=target_user;
  insert into public.account_email_verifications(user_id,verified_email,verified_at)
  values(target_user,account.normalized_email,coalesce(account.email_verified_at,now_at))
  on conflict(user_id) do update set verified_email=excluded.verified_email,verified_at=excluded.verified_at;
  update public.join_requests set status='superseded',reviewed_by=invite.invited_by,reviewed_at=now_at,
    decision_message='Superseded by an accepted group invitation.'
  where group_id=invite.group_id and user_id=target_user and status in ('pending','rejected');
  update public.group_invitations set status='accepted',accepted_at=now_at,accepted_by=target_user,invitee_user_id=target_user where id=invite.id;
  return jsonb_build_object('status','accepted','group_id',invite.group_id,'group_name',group_name,'member_id',member_id);
end;
$$;
revoke all on function public.activate_group_invitation_for_user(text,uuid) from public, anon, authenticated;
grant execute on function public.activate_group_invitation_for_user(text,uuid) to service_role;

create or replace function public.accept_group_invitation(target_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return public.activate_group_invitation_for_user(target_token_hash,auth.uid());
end;
$$;
revoke all on function public.accept_group_invitation(text) from public, anon;
grant execute on function public.accept_group_invitation(text) to authenticated;

create or replace function public.create_invited_application_account(
  target_user uuid,target_email text,target_full_name text,target_phone text,target_password_hash text,
  target_session_hash text,target_session_expiry timestamptz,target_ip text,target_user_agent text,target_invitation_hash text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account_id uuid; accepted jsonb; normalized_email text:=lower(btrim(target_email));
  normalized_phone text:=regexp_replace(btrim(coalesce(target_phone,'')),'[[:space:]().-]','','g');
  now_at timestamptz:=pg_catalog.clock_timestamp();
begin
  if target_invitation_hash is null or target_invitation_hash !~ '^[0-9a-f]{64}$'
     or target_password_hash is null or char_length(target_password_hash)>256
     or target_session_hash is null or target_session_hash !~ '^[0-9a-f]{64}$'
     or normalized_email is null or char_length(normalized_email) not between 3 and 254
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     or target_full_name is null or char_length(btrim(target_full_name)) not between 2 and 120
     or normalized_phone !~ '^\+?[0-9][0-9]{6,19}$' or target_session_expiry<=now_at then raise exception 'Invalid invited account'; end if;
  if not exists(select 1 from public.group_invitations i where i.token_hash=target_invitation_hash and i.email=normalized_email and i.status in ('pending','sent','delivery_failed') and i.expires_at>now_at) then
    raise exception 'Invitation is not valid for this account';
  end if;
  insert into public.profiles(id,full_name,phone,email,normalized_email,email_verified_at,account_status)
  values(target_user,btrim(target_full_name),normalized_phone,normalized_email,normalized_email,now_at,'active');
  insert into public.app_password_credentials(user_id,password_hash,password_changed_at) values(target_user,target_password_hash,now_at);
  insert into public.app_sessions(user_id,token_hash,expires_at,ip_address,user_agent)
  values(target_user,target_session_hash,target_session_expiry,left(target_ip,64),left(target_user_agent,512));
  insert into public.account_email_verifications(user_id,verified_email,verified_at)
  values(target_user,normalized_email,now_at);
  accepted:=public.activate_group_invitation_for_user(target_invitation_hash,target_user);
  if accepted ->> 'status' <> 'accepted' then raise exception 'Invitation activation failed'; end if;
  return accepted;
end;
$$;
revoke all on function public.create_invited_application_account(uuid,text,text,text,text,text,timestamptz,text,text,text) from public, anon, authenticated;
grant execute on function public.create_invited_application_account(uuid,text,text,text,text,text,timestamptz,text,text,text) to service_role;

create or replace function public.notify_group_invitation_lifecycle()
returns trigger language plpgsql security definer set search_path = '' as $$
declare group_name text; invitee_name text;
begin
  if tg_op <> 'UPDATE' or old.status is not distinct from new.status then return new; end if;
  if new.status not in ('accepted','declined','expired','revoked','delivery_failed') then return new; end if;
  select g.name into group_name from public.groups g where g.id=new.group_id;
  if group_name is null then return new; end if;
  select coalesce(nullif(p.full_name,''),split_part(p.email,'@',1)) into invitee_name
  from public.profiles p where p.id=new.invitee_user_id;
  insert into public.notifications(user_id,title,body,href)
  values(new.invited_by,
    case new.status when 'accepted' then 'Group invitation accepted' when 'declined' then 'Group invitation declined'
      when 'expired' then 'Group invitation expired' when 'revoked' then 'Group invitation revoked' else 'Invitation email could not be delivered' end,
    case new.status when 'accepted' then coalesce(invitee_name,new.email)||' accepted your invitation to join '||group_name||'.'
      when 'declined' then new.email||' declined your invitation to join '||group_name||'.'
      when 'expired' then 'Your invitation to '||new.email||' for '||group_name||' expired.'
      when 'revoked' then 'The invitation to '||new.email||' for '||group_name||' was revoked.'
      else 'The invitation to '||new.email||' for '||group_name||' could not be delivered. You can retry it from Invitations.' end,
    '/dashboard/invitations');
  if new.status='accepted' and new.invitee_user_id is not null then
    insert into public.notifications(user_id,title,body,href)
    values(new.invitee_user_id,'Welcome to '||group_name,
      'Your membership is active. Continue your group onboarding to open your Member space.',
      '/dashboard/onboarding?group='||new.group_id::text);
  end if;
  return new;
end;
$$;
revoke all on function public.notify_group_invitation_lifecycle() from public, anon, authenticated;

comment on table public.member_onboarding is 'Onboarding progress is scoped to the group membership, never globally to the user.';
comment on table public.group_member_fields is 'Group-defined member onboarding fields; values are stored per member onboarding record.';

create or replace function public.validate_cycle_member_share_selection()
returns trigger language plpgsql set search_path = '' as $$
declare selection jsonb := coalesce(new.rules -> 'member_share_selection', '{}'::jsonb);
  minimum_units numeric; maximum_units numeric; required_units numeric;
begin
  if jsonb_typeof(selection) <> 'object' then raise exception 'Member share selection settings must be an object'; end if;
  if not coalesce((selection ->> 'enabled')::boolean, false) then return new; end if;
  begin
    minimum_units := coalesce(nullif(selection ->> 'min_units','')::numeric,1);
    maximum_units := nullif(selection ->> 'max_units','')::numeric;
    required_units := coalesce(nullif(selection ->> 'required_units','')::numeric,minimum_units);
  exception when others then raise exception 'Member share selection limits must be valid numbers'; end;
  if new.share_price <= 0 or minimum_units <= 0 or required_units < minimum_units
     or minimum_units > 1000000 or required_units > 1000000
     or round(minimum_units,2) <> minimum_units or round(required_units,2) <> required_units
     or (maximum_units is not null and (maximum_units < minimum_units or maximum_units > 1000000 or round(maximum_units,2) <> maximum_units))
     or (maximum_units is not null and required_units > maximum_units) then
    raise exception 'Member share selection requires a positive share price and valid unit limits';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_cycle_member_share_selection() from public, anon, authenticated;
drop trigger if exists group_cycles_validate_member_share_selection on public.group_cycles;
create trigger group_cycles_validate_member_share_selection before insert or update of rules, share_price on public.group_cycles
for each row execute function public.validate_cycle_member_share_selection();

-- Newly activated members must finish this group's onboarding before their
-- self-scoped financial records become readable or financial actions are
-- available. Management permissions remain independently effective.
drop policy if exists group_cycles_read on public.group_cycles;
create policy group_cycles_read on public.group_cycles for select to authenticated using (
  public.has_group_permission(group_id, 'cycles:read')
  or public.has_group_permission(group_id, 'cycles:manage')
  or exists (
    select 1 from public.members m
    where m.group_id = group_cycles.group_id and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);

drop policy if exists contributions_read_authorized on public.contributions;
create policy contributions_read_authorized on public.contributions for select to authenticated using (
  public.has_group_permission(group_id, 'contributions:read')
  or exists (
    select 1 from public.members m where m.id = contributions.member_id
      and m.group_id = contributions.group_id and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);

drop policy if exists contributions_insert_authorized on public.contributions;
create policy contributions_insert_authorized on public.contributions for insert to authenticated with check (
  status = 'pending' and verified_by is null and verified_at is null
  and exists (
    select 1 from public.members m where m.id = contributions.member_id
      and m.group_id = contributions.group_id and m.status = 'active'
  )
  and (
    public.has_group_permission(group_id, 'contributions:record')
    or exists (
      select 1 from public.members m where m.id = contributions.member_id
        and m.group_id = contributions.group_id and m.user_id = auth.uid() and m.status = 'active'
        and public.member_onboarding_is_complete(m.group_id)
    )
  )
);

drop policy if exists loans_read_authorized on public.loans;
create policy loans_read_authorized on public.loans for select to authenticated using (
  public.has_group_permission(group_id, 'loans:read')
  or exists (
    select 1 from public.members m where m.id = loans.member_id
      and m.group_id = loans.group_id and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);

drop policy if exists loans_apply_member on public.loans;
create policy loans_apply_member on public.loans for insert to authenticated with check (
  status = 'pending' and approved_by is null and principal = outstanding_amount
  and exists (
    select 1 from public.members m where m.id = loans.member_id and m.group_id = loans.group_id
      and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);

drop policy if exists loans_draft_owner_update on public.loans;
create policy loans_draft_owner_update on public.loans for update to authenticated
using (is_draft and status = 'pending' and exists (
  select 1 from public.members m where m.id = loans.member_id and m.group_id = loans.group_id
    and m.user_id = auth.uid() and m.status = 'active' and public.member_onboarding_is_complete(m.group_id)
))
with check (is_draft and status = 'pending' and exists (
  select 1 from public.members m where m.id = loans.member_id and m.group_id = loans.group_id
    and m.user_id = auth.uid() and m.status = 'active' and public.member_onboarding_is_complete(m.group_id)
));

drop policy if exists obligations_read on public.contribution_obligations;
create policy obligations_read on public.contribution_obligations for select to authenticated using (
  public.has_group_permission(group_id, 'obligations:read')
  or exists (
    select 1 from public.members m where m.id = contribution_obligations.member_id
      and m.group_id = contribution_obligations.group_id and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);

drop policy if exists shares_read on public.share_transactions;
create policy shares_read on public.share_transactions for select to authenticated using (
  public.has_group_permission(group_id, 'shares:read')
  or public.has_group_permission(group_id, 'financial:read')
  or exists (
    select 1 from public.members m where m.id = share_transactions.member_id
      and m.group_id = share_transactions.group_id and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);

drop policy if exists shares_insert on public.share_transactions;
create policy shares_insert on public.share_transactions for insert to authenticated with check (
  created_by = auth.uid() and (
    public.has_group_permission(group_id, 'shares:manage')
    or exists (
      select 1 from public.members m where m.id = share_transactions.member_id
        and m.group_id = share_transactions.group_id and m.user_id = auth.uid() and m.status = 'active'
        and share_transactions.direction = 'purchase' and public.member_onboarding_is_complete(m.group_id)
    )
  )
);

drop policy if exists social_requests_read on public.social_fund_requests;
create policy social_requests_read on public.social_fund_requests for select to authenticated using (
  public.has_group_permission(group_id, 'social_fund:read')
  or public.has_group_permission(group_id, 'social_fund:decide')
  or public.has_group_permission(group_id, 'social_fund:manage')
  or public.has_group_permission(group_id, 'financial:read')
  or exists (
    select 1 from public.members m where m.id = social_fund_requests.member_id
      and m.group_id = social_fund_requests.group_id and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);

drop policy if exists social_requests_insert on public.social_fund_requests;
create policy social_requests_insert on public.social_fund_requests for insert to authenticated with check (
  requested_by = auth.uid() and exists (
    select 1 from public.members m where m.id = social_fund_requests.member_id
      and m.group_id = social_fund_requests.group_id and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);

drop policy if exists interest_read on public.loan_interest_charges;
create policy interest_read on public.loan_interest_charges for select to authenticated using (
  public.has_group_permission(group_id, 'interest:read')
  or public.has_group_permission(group_id, 'financial:read')
  or exists (
    select 1 from public.loans l join public.members m on m.id = l.member_id
    where l.id = loan_interest_charges.loan_id and l.group_id = loan_interest_charges.group_id
      and m.group_id = l.group_id and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);

drop policy if exists loan_repayments_read_authorized on public.loan_repayments;
create policy loan_repayments_read_authorized on public.loan_repayments for select to authenticated using (
  public.has_group_permission(group_id, 'repayments:read')
  or public.has_group_permission(group_id, 'financial:read')
  or exists (
    select 1 from public.loans l join public.members m on m.id = l.member_id
    where l.id = loan_repayments.loan_id and l.group_id = loan_repayments.group_id
      and m.group_id = l.group_id and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);

drop policy if exists loan_repayments_submit_authorized on public.loan_repayments;
create policy loan_repayments_submit_authorized on public.loan_repayments for insert to authenticated with check (
  created_by = auth.uid() and received_by = auth.uid() and status = 'pending'
  and exists (
    select 1 from public.loans l join public.members m on m.id = l.member_id
    where l.id = loan_repayments.loan_id and l.group_id = loan_repayments.group_id
      and l.status in ('active', 'defaulted') and m.group_id = l.group_id
      and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);

drop policy if exists cycle_members_read on public.cycle_members;
create policy cycle_members_read on public.cycle_members for select to authenticated using (
  public.has_group_permission(group_id, 'members:read')
  or exists (
    select 1 from public.members m where m.id = cycle_members.member_id
      and m.group_id = cycle_members.group_id and m.user_id = auth.uid() and m.status = 'active'
      and public.member_onboarding_is_complete(m.group_id)
  )
);
