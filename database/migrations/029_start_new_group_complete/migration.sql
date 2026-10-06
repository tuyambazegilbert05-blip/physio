-- 029_start_new_group_complete/migration.sql
-- Transactional group initialization with founding membership, approved chairperson roles,
-- initial 2-year operational cycle, rules, and onboarding custom requirements.

create or replace function public.initialize_new_group(
  group_name text,
  group_description text default '',
  group_location text default null,
  is_discoverable boolean default true,
  currency_code text default 'RWF',
  cycle_start_date date default current_date,
  cycle_name text default 'Cycle 1',
  share_unit_price numeric default 25000,
  social_contribution numeric default 5000,
  loan_max numeric default 2000000,
  rate_up_to_4_months numeric default 3,
  rate_over_4_months numeric default 5,
  due_day smallint default 1,
  rules_title text default null,
  rules_body text default null,
  member_fields jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  account public.profiles%rowtype;
  new_group_id uuid;
  new_member_id uuid;
  new_cycle_id uuid;
  calculated_end_date date;
  clean_name text;
  clean_currency text;
  field_item jsonb;
  rule_title_clean text;
  rule_body_clean text;
begin
  -- 1. Authorization check
  if auth.uid() is null or not public.current_account_email_verified() then
    raise exception 'Verify your email before creating an Ikimina';
  end if;

  select * into account from public.profiles where id = auth.uid();
  if account.id is null then
    raise exception 'User profile not found';
  end if;

  -- 2. Validation
  clean_name := btrim(coalesce(group_name, ''));
  if char_length(clean_name) < 2 or char_length(clean_name) > 120 then
    raise exception 'Group name must be between 2 and 120 characters';
  end if;

  if share_unit_price <= 0 then
    raise exception 'Share price must be greater than zero';
  end if;

  if social_contribution < 0 then
    raise exception 'Social contribution cannot be negative';
  end if;

  if loan_max <= 0 then
    raise exception 'Maximum loan limit must be greater than zero';
  end if;

  if rate_up_to_4_months not between 0 and 100 or rate_over_4_months not between 0 and 100 then
    raise exception 'Interest rates must be between 0 and 100 percent';
  end if;

  if due_day not between 1 and 28 then
    due_day := 1;
  end if;

  clean_currency := upper(btrim(coalesce(currency_code, 'RWF')));
  if char_length(clean_currency) <> 3 then
    clean_currency := 'RWF';
  end if;

  -- End date is exactly 2 years from start date
  calculated_end_date := (cycle_start_date + interval '2 years')::date;

  -- 3. Insert Group
  insert into public.groups(
    name, description, location, discoverable,
    contribution_amount, contribution_frequency, currency, created_by
  )
  values (
    clean_name,
    coalesce(group_description, ''),
    nullif(btrim(coalesce(group_location, '')), ''),
    coalesce(is_discoverable, true),
    share_unit_price,
    'monthly',
    clean_currency,
    auth.uid()
  )
  returning id into new_group_id;

  -- 4. Insert Founding Member
  insert into public.members(
    group_id, user_id, full_name, email, legacy_role, status
  )
  values (
    new_group_id, account.id, account.full_name, account.email, 'member', 'active'
  )
  returning id into new_member_id;

  -- 5. Role assignments: Chairperson, Committee Member, System Administrator
  -- Explicitly NO Treasurer, Secretary, Technician, Security Admin, Super Admin
  insert into public.group_role_assignments(group_id, user_id, role_key, user_email, granted_by)
  values
    (new_group_id, account.id, 'chairperson', account.normalized_email, account.id),
    (new_group_id, account.id, 'committee_member', account.normalized_email, account.id),
    (new_group_id, account.id, 'system_administrator', account.normalized_email, account.id)
  on conflict (group_id, user_id, role_key) do nothing;

  -- 6. Initialize First 2-Year Cycle
  insert into public.group_cycles(
    group_id, cycle_number, name, starts_on, ends_on,
    share_price, contribution_amount, contribution_due_day,
    late_penalty, loan_limit, rules, created_by, status
  )
  values (
    new_group_id, 1,
    coalesce(nullif(btrim(cycle_name), ''), 'Cycle 1'),
    cycle_start_date, calculated_end_date,
    share_unit_price, share_unit_price, due_day,
    0, loan_max,
    jsonb_build_object(
      'social_contribution_amount', social_contribution,
      'interest_rate_up_to_4_months', rate_up_to_4_months,
      'interest_rate_over_4_months', rate_over_4_months,
      'max_active_loans', 1,
      'contribution_frequency', 'monthly',
      'cycle_duration_years', 2
    ),
    auth.uid(),
    'open'
  )
  returning id into new_cycle_id;

  -- Enroll founding member into cycle_members
  insert into public.cycle_members(group_id, cycle_id, member_id)
  values (new_group_id, new_cycle_id, new_member_id)
  on conflict do nothing;

  -- 7. Group Rules / Terms (if provided)
  rule_title_clean := nullif(btrim(coalesce(rules_title, '')), '');
  rule_body_clean := nullif(btrim(coalesce(rules_body, '')), '');
  if rule_body_clean is not null and char_length(rule_body_clean) >= 10 then
    insert into public.group_membership_terms(
      group_id, version, title, body, is_required, is_current, created_by
    )
    values (
      new_group_id, 1,
      coalesce(rule_title_clean, 'Group Rules & Constitution'),
      rule_body_clean,
      true, true, auth.uid()
    );
  end if;

  -- 8. Custom Member Requirements / Fields (if provided)
  if member_fields is not null and jsonb_typeof(member_fields) = 'array' then
    for field_item in select value from jsonb_array_elements(member_fields) loop
      if nullif(btrim(coalesce(field_item ->> 'label', '')), '') is not null then
        insert into public.group_member_fields(
          group_id, label, description, field_type,
          is_required, options, is_active, display_order, created_by
        )
        values (
          new_group_id,
          btrim(field_item ->> 'label'),
          coalesce(field_item ->> 'description', ''),
          coalesce(nullif(field_item ->> 'field_type', ''), 'text'),
          coalesce((field_item ->> 'is_required')::boolean, false),
          coalesce(field_item -> 'options', '[]'::jsonb),
          true,
          coalesce((field_item ->> 'display_order')::integer, 0),
          auth.uid()
        );
      end if;
    end loop;
  end if;

  -- 9. Audit Event
  insert into public.audit_logs(
    group_id, actor_id, action, entity, entity_id, details
  )
  values (
    new_group_id, auth.uid(), 'initialize', 'groups', new_group_id::text,
    jsonb_build_object(
      'group_name', clean_name,
      'cycle_id', new_cycle_id,
      'cycle_start', cycle_start_date,
      'cycle_end', calculated_end_date,
      'share_price', share_unit_price,
      'social_contribution', social_contribution,
      'loan_limit', loan_max,
      'discoverable', is_discoverable
    )
  );

  return jsonb_build_object(
    'group_id', new_group_id,
    'name', clean_name,
    'cycle_id', new_cycle_id,
    'cycle_name', coalesce(nullif(btrim(cycle_name), ''), 'Cycle 1'),
    'starts_on', cycle_start_date,
    'ends_on', calculated_end_date,
    'share_price', share_unit_price,
    'social_contribution', social_contribution,
    'member_id', new_member_id,
    'roles', jsonb_build_array('chairperson', 'committee_member', 'system_administrator')
  );
end;
$$;

revoke all on function public.initialize_new_group(
  text, text, text, boolean, text, date, text, numeric, numeric, numeric, numeric, numeric, smallint, text, text, jsonb
) from public, anon;
grant execute on function public.initialize_new_group(
  text, text, text, boolean, text, date, text, numeric, numeric, numeric, numeric, numeric, smallint, text, text, jsonb
) to authenticated;

-- Upgrade legacy create_group to call initialize_new_group transparently
create or replace function public.create_group(
  group_name text, contribution numeric, frequency text, currency_code text,
  group_description text, group_location text, is_discoverable boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
begin
  result := public.initialize_new_group(
    group_name,
    group_description,
    group_location,
    is_discoverable,
    currency_code,
    current_date,
    'Cycle 1',
    coalesce(contribution, 25000),
    5000,
    2000000,
    3,
    5,
    1::smallint
  );
  return (result ->> 'group_id')::uuid;
end;
$$;
