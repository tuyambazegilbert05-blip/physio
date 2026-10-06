-- Allow the Chairperson to configure the group-specific onboarding process
-- without granting broader permission to edit the group profile.
insert into public.permissions(permission_key,label,permission_domain)
values('onboarding:manage','Manage member onboarding requirements','administrative')
on conflict(permission_key) do update set label=excluded.label,permission_domain=excluded.permission_domain;

insert into public.role_permissions(role_key,permission_key)
values('chairperson','onboarding:manage')
on conflict do nothing;

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
  if auth.uid() is null or not (
    public.has_group_permission(target_group, 'groups:manage')
    or public.has_group_permission(target_group, 'onboarding:manage')
  ) then
    raise exception 'Member onboarding settings permission required';
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
    case when public.has_group_permission(target_group,'groups:manage') then 'groups:manage' else 'onboarding:manage' end,
    public.current_group_roles(target_group));
  return jsonb_build_object('saved',true,'terms_changed',changed_terms,'fields_changed',fields_changed);
end;
$$;
revoke all on function public.save_group_onboarding_config(uuid,text,text,boolean,jsonb) from public, anon;
grant execute on function public.save_group_onboarding_config(uuid,text,text,boolean,jsonb) to authenticated;
