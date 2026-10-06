-- Enforce cycle snapshots, member obligations, and loan terms at the database
-- boundary. Existing cycles/obligations are preserved; only new cycle defaults
-- and newly generated obligations use the confirmed defaults below.

alter table public.group_cycles alter column share_price set default 25000;
alter table public.group_cycles alter column loan_limit set default 2000000;

alter table public.contribution_obligations
  add column if not exists savings_due numeric(15,0) not null default 0,
  add column if not exists social_due numeric(15,0) not null default 0;

-- Old obligations did not store the savings/social split. Preserve their total
-- as savings rather than manufacturing historical social-fund obligations.
update public.contribution_obligations
set savings_due = amount_due, social_due = 0
where savings_due = 0 and social_due = 0 and amount_due <> 0;

alter table public.contribution_obligations
  drop constraint if exists contribution_obligations_amount_split_check;
alter table public.contribution_obligations
  add constraint contribution_obligations_amount_split_check
  check (amount_due = savings_due + social_due);

create index if not exists share_transactions_cycle_member_effective_idx
  on public.share_transactions(group_id, cycle_id, member_id, created_at)
  where status = 'verified';

create unique index if not exists contributions_reference_unique
  on public.contributions(group_id, lower(btrim(reference)))
  where reference is not null and length(btrim(reference)) > 0;

create or replace function public.create_group_cycle(
  target_group uuid, cycle_name text, cycle_start date, cycle_end date,
  share_unit_price numeric, monthly_contribution numeric, due_day smallint,
  late_penalty_amount numeric, max_loan numeric, business_rules jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare next_number integer; new_cycle uuid; cycle_rules jsonb;
begin
  if not public.has_group_permission(target_group, 'cycles:manage') then raise exception 'Cycle management permission required'; end if;
  if cycle_end < cycle_start or share_unit_price <= 0 or monthly_contribution < 0
     or due_day not between 1 and 28 or late_penalty_amount < 0
     or max_loan is null or max_loan <= 0 or jsonb_typeof(business_rules) <> 'object' then
    raise exception 'Cycle configuration or date range is invalid';
  end if;
  cycle_rules := business_rules || jsonb_build_object(
    'social_contribution_amount', coalesce(nullif(business_rules ->> 'social_contribution_amount', '')::numeric, 5000),
    'interest_rate_up_to_4_months', coalesce(nullif(business_rules ->> 'interest_rate_up_to_4_months', '')::numeric, 3),
    'interest_rate_over_4_months', coalesce(nullif(business_rules ->> 'interest_rate_over_4_months', '')::numeric, 5)
  );
  if (cycle_rules ->> 'social_contribution_amount')::numeric < 0
     or (cycle_rules ->> 'interest_rate_up_to_4_months')::numeric not between 0 and 100
     or (cycle_rules ->> 'interest_rate_over_4_months')::numeric not between 0 and 100 then
    raise exception 'Cycle financial configuration is invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_group::text, 0));
  select coalesce(max(cycle_number), 0) + 1 into next_number from public.group_cycles where group_id = target_group;
  insert into public.group_cycles(group_id, cycle_number, name, starts_on, ends_on, share_price, contribution_amount, contribution_due_day, late_penalty, loan_limit, rules, created_by)
  values (target_group, next_number, cycle_name, cycle_start, cycle_end, share_unit_price, monthly_contribution, due_day, late_penalty_amount, max_loan, cycle_rules, auth.uid())
  returning id into new_cycle;
  insert into public.cycle_members(group_id, cycle_id, member_id)
  select target_group, new_cycle, m.id from public.members m where m.group_id = target_group and m.status = 'active';
  return new_cycle;
end;
$$;

-- Cycle financial terms become immutable once the cycle opens. A new cycle is
-- the supported way to adopt new prices/rates and keeps historical rules intact.
create or replace function public.guard_cycle_financial_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(nullif(new.rules ->> 'social_contribution_amount', '')::numeric, 5000) < 0
     or coalesce(nullif(new.rules ->> 'interest_rate_up_to_4_months', '')::numeric, 3) not between 0 and 100
     or coalesce(nullif(new.rules ->> 'interest_rate_over_4_months', '')::numeric, 5) not between 0 and 100 then
    raise exception 'Cycle financial configuration is invalid';
  end if;
  if old.status <> 'draft' and (
    new.share_price is distinct from old.share_price
    or new.contribution_amount is distinct from old.contribution_amount
    or new.contribution_due_day is distinct from old.contribution_due_day
    or new.late_penalty is distinct from old.late_penalty
    or new.loan_limit is distinct from old.loan_limit
    or new.rules is distinct from old.rules
  ) then
    raise exception 'Financial terms are locked after a cycle opens; configure the next cycle instead';
  end if;
  return new;
end;
$$;
drop trigger if exists group_cycles_financial_snapshot_guard on public.group_cycles;
create trigger group_cycles_financial_snapshot_guard
before update on public.group_cycles for each row
execute function public.guard_cycle_financial_snapshot();

create or replace function public.generate_monthly_obligations(target_group uuid, target_cycle uuid, obligation_period date)
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer; period_start date; period_end date;
begin
  if not public.has_group_permission(target_group, 'obligations:manage') then raise exception 'Contribution-obligation permission required'; end if;
  period_start := date_trunc('month', obligation_period)::date;
  period_end := (period_start + interval '1 month - 1 day')::date;
  if period_start > date_trunc('month', current_date)::date then raise exception 'Obligations cannot be generated for a future month'; end if;
  insert into public.contribution_obligations(group_id, cycle_id, member_id, period, due_on, amount_due, savings_due, social_due, created_by)
  select c.group_id, c.id, cm.member_id, period_start,
    make_date(extract(year from period_start)::integer, extract(month from period_start)::integer, c.contribution_due_day),
    round(share_position.units * c.share_price) + social_amount.value,
    round(share_position.units * c.share_price), social_amount.value, auth.uid()
  from public.group_cycles c
  join public.cycle_members cm on cm.cycle_id = c.id and cm.group_id = c.group_id
  join public.members m on m.id = cm.member_id and m.group_id = cm.group_id and m.status = 'active'
  join public.member_onboarding onboarding_state on onboarding_state.member_id = cm.member_id
    and onboarding_state.group_id = cm.group_id and onboarding_state.completed_at is not null
  join lateral (
    select greatest(coalesce(sum(case when st.direction = 'purchase' then st.units else -st.units end), 0)
      + coalesce((
        select onboarding.selected_share_units
        from public.member_onboarding onboarding
        join public.share_transactions selected on selected.id = onboarding.share_transaction_id
        where onboarding.group_id = c.group_id and onboarding.member_id = cm.member_id
          and onboarding.share_selection_cycle_id = c.id and selected.cycle_id = c.id
          and selected.status = 'pending' and selected.created_at < period_end + 1
      ), 0), 0) as units
    from public.share_transactions st
    where st.group_id = c.group_id and st.cycle_id = c.id and st.member_id = cm.member_id
      and st.status = 'verified' and coalesce(st.verified_at, st.created_at) < period_end + 1
  ) share_position on true
  cross join lateral (
    select coalesce(nullif(c.rules ->> 'social_contribution_amount', '')::numeric, 5000)::numeric(15,0) as value
  ) social_amount
  where c.id = target_cycle and c.group_id = target_group and c.status = 'open'
    and period_start between date_trunc('month', c.starts_on)::date and date_trunc('month', c.ends_on)::date
    and cm.status = 'active' and cm.joined_on <= period_end
    and (cm.ended_on is null or cm.ended_on >= period_start)
  on conflict (cycle_id, member_id, period) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- Rate is determined from the cycle snapshot and term, never from a client
-- supplied rate. The original principal remains the monthly interest basis.
create or replace function public.enforce_cycle_loan_terms()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cycle_row public.group_cycles%rowtype; existing_open boolean;
begin
  if tg_op = 'UPDATE' and (new.status is distinct from old.status or new.is_draft is distinct from old.is_draft) then return new; end if;
  if tg_op = 'UPDATE' and new.principal is not distinct from old.principal
     and new.term_months is not distinct from old.term_months
     and new.cycle_id is not distinct from old.cycle_id
     and new.interest_rate is not distinct from old.interest_rate then return new; end if;
  if tg_op = 'INSERT' and new.status <> 'pending' then raise exception 'Loan applications must begin pending Committee review'; end if;
  if tg_op = 'UPDATE' and (old.status <> 'pending' or not old.is_draft) then raise exception 'Only an editable loan draft may change its financial terms'; end if;
  if new.cycle_id is null then raise exception 'New loans must belong to an open financial cycle'; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.member_id::text, 0));
  select * into cycle_row from public.group_cycles c
  where c.id = new.cycle_id and c.group_id = new.group_id and c.status = 'open' for share;
  if not found then raise exception 'The loan must belong to this group’s open cycle'; end if;
  if new.term_months < 1 or new.term_months > 120 or new.principal <= 0 then raise exception 'Loan terms are invalid'; end if;
  if new.principal > coalesce(cycle_row.loan_limit, 2000000) then raise exception 'Requested amount is above the cycle loan limit'; end if;
  if not exists (select 1 from public.members m where m.id = new.member_id and m.group_id = new.group_id and m.status = 'active') then
    raise exception 'Only an active member may request a loan';
  end if;
  if new.status in ('pending', 'approved', 'active', 'defaulted') then
    select exists (select 1 from public.loans l where l.member_id = new.member_id and l.id <> new.id
      and l.status in ('pending', 'approved', 'active', 'defaulted')) into existing_open;
    if existing_open then raise exception 'This member already has a pending or active loan'; end if;
  end if;
  new.interest_rate := case when new.term_months <= 4
    then coalesce(nullif(cycle_row.rules ->> 'interest_rate_up_to_4_months', '')::numeric, 3)
    else coalesce(nullif(cycle_row.rules ->> 'interest_rate_over_4_months', '')::numeric, 5) end;
  return new;
end;
$$;
drop trigger if exists loans_cycle_terms_guard on public.loans;
create trigger loans_cycle_terms_guard
before insert or update of principal, interest_rate, term_months, cycle_id on public.loans
for each row execute function public.enforce_cycle_loan_terms();

create or replace function public.accrue_monthly_interest(target_group uuid, interest_period date)
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer; period_start date;
begin
  if not public.has_group_permission(target_group, 'interest:calculate') then raise exception 'Interest calculation permission required'; end if;
  period_start := date_trunc('month', interest_period)::date;
  if period_start > date_trunc('month', current_date)::date then raise exception 'Interest cannot be calculated for a future month'; end if;
  with added as (
    insert into public.loan_interest_charges(group_id, loan_id, period, due_on, principal_basis, rate, amount, created_by)
    select l.group_id, l.id, period_start, (period_start + interval '1 month - 1 day')::date,
      l.principal, l.interest_rate,
      round(l.principal * l.interest_rate / 100)::numeric(15,0), auth.uid()
    from public.loans l
    where l.group_id = target_group and l.status in ('active', 'defaulted') and l.principal > 0
    on conflict (loan_id, period) do nothing
    returning loan_id, amount
  ), updated as (
    update public.loans l set outstanding_interest = l.outstanding_interest + added.amount
    from added where l.id = added.loan_id returning l.id
  )
  select count(*)::integer into inserted_count from updated;
  return inserted_count;
end;
$$;

drop function if exists public.update_loan_draft(uuid,numeric,integer,text);
drop function if exists public.update_loan_draft(uuid,numeric,numeric,integer,text);
create function public.update_loan_draft(target_loan uuid, requested_principal numeric, requested_term integer, requested_purpose text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare loan_row public.loans%rowtype; cycle_limit numeric;
begin
  select l.* into loan_row from public.loans l where l.id = target_loan and l.status = 'pending' and l.is_draft
    and exists (select 1 from public.members m where m.id = l.member_id and m.user_id = auth.uid() and m.status = 'active')
    for update;
  if not found then raise exception 'Draft not found or no longer editable'; end if;
  select c.loan_limit into cycle_limit from public.group_cycles c where c.id = loan_row.cycle_id and c.group_id = loan_row.group_id and c.status = 'open';
  if not found then raise exception 'The savings cycle is no longer open'; end if;
  if requested_principal <= 0 or requested_term < 1 or requested_term > 120 or char_length(btrim(requested_purpose)) < 5 then
    raise exception 'Draft values are invalid';
  end if;
  if requested_principal > coalesce(cycle_limit, 2000000) then raise exception 'Requested amount is above the cycle loan limit'; end if;
  update public.loans set principal = requested_principal, outstanding_amount = requested_principal,
    term_months = requested_term, purpose = btrim(requested_purpose) where id = target_loan;
  return target_loan;
end;
$$;

revoke all on function public.guard_cycle_financial_snapshot() from public, anon, authenticated;
revoke all on function public.enforce_cycle_loan_terms() from public, anon, authenticated;
revoke all on function public.create_group_cycle(uuid,text,date,date,numeric,numeric,smallint,numeric,numeric,jsonb) from public, anon;
grant execute on function public.create_group_cycle(uuid,text,date,date,numeric,numeric,smallint,numeric,numeric,jsonb) to authenticated;
revoke all on function public.generate_monthly_obligations(uuid,uuid,date) from public, anon;
grant execute on function public.generate_monthly_obligations(uuid,uuid,date) to authenticated;
revoke all on function public.accrue_monthly_interest(uuid,date) from public, anon;
grant execute on function public.accrue_monthly_interest(uuid,date) to authenticated;
revoke all on function public.update_loan_draft(uuid,numeric,integer,text) from public, anon;
grant execute on function public.update_loan_draft(uuid,numeric,integer,text) to authenticated;

create unique index if not exists expenses_reference_unique
  on public.expenses(group_id, lower(btrim(reference)))
  where reference is not null and length(btrim(reference)) > 0;

-- Cycle closure is a gated transition. Missing month closes, unresolved
-- corrections, open reconciliations, or unsettled loans keep the cycle open.
create or replace function public.set_group_cycle_status(target_group uuid, target_cycle uuid, next_status text, cycle_end date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare cycle_row public.group_cycles%rowtype; effective_end date; month_start date;
begin
  if not public.has_group_permission(target_group, 'cycles:manage') then raise exception 'Cycle management permission required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_group::text, 0));
  select * into cycle_row from public.group_cycles where id = target_cycle and group_id = target_group for update;
  if not found then raise exception 'Cycle not found'; end if;
  if not ((cycle_row.status = 'draft' and next_status = 'open')
      or (cycle_row.status = 'open' and next_status = 'closing')
      or (cycle_row.status = 'closing' and next_status in ('open', 'closed'))
      or (cycle_row.status = 'closed' and next_status = 'archived')) then
    raise exception 'Invalid cycle state transition';
  end if;
  effective_end := coalesce(cycle_end, cycle_row.ends_on);
  if next_status = 'closed' then
    if effective_end > current_date then raise exception 'A cycle cannot close before its end date'; end if;
    if exists (
      select 1 from generate_series(date_trunc('month', cycle_row.starts_on)::timestamp,
        date_trunc('month', effective_end)::timestamp, interval '1 month') as months(month_start)
      where not exists (select 1 from public.financial_period_closings f
        where f.group_id = target_group and f.cycle_id = target_cycle
          and f.period = months.month_start::date and f.status = 'closed')
    ) then raise exception 'Every financial month in the cycle must be closed first'; end if;
    if exists (select 1 from public.financial_correction_requests r join public.financial_period_closings f on f.id = r.closing_id
      where f.group_id = target_group and f.cycle_id = target_cycle and r.status in ('pending', 'approved')) then
      raise exception 'Resolve all financial correction requests before cycle closure';
    end if;
    if exists (select 1 from public.bank_transactions b where b.group_id = target_group
      and b.transaction_date::date between cycle_row.starts_on and effective_end and b.status = 'unmatched') then
      raise exception 'Reconcile or explicitly ignore every bank transaction before cycle closure';
    end if;
    if exists (select 1 from public.contributions c where c.cycle_id = target_cycle and c.status = 'pending')
       or exists (select 1 from public.loan_repayments r join public.loans l on l.id = r.loan_id where l.cycle_id = target_cycle and r.status = 'pending')
       or exists (select 1 from public.share_transactions s where s.cycle_id = target_cycle and s.status = 'pending')
       or exists (select 1 from public.expenses e where e.cycle_id = target_cycle and e.status = 'pending')
       or exists (select 1 from public.social_fund_requests r join public.cycle_members cm on cm.member_id = r.member_id and cm.cycle_id = target_cycle where r.group_id = target_group and r.status in ('pending', 'approved')) then
      raise exception 'Resolve pending financial reviews before cycle closure';
    end if;
    if exists (select 1 from public.loans l where l.cycle_id = target_cycle
      and l.status in ('approved', 'active', 'defaulted') and (l.outstanding_amount > 0 or l.outstanding_interest > 0)) then
      raise exception 'Outstanding cycle loans must be settled; no Committee close policy is configured';
    end if;
    if not exists (select 1 from public.profit_calculations p where p.group_id = target_group and p.cycle_id = target_cycle
      and p.period is null and ((p.status = 'distributed' and p.allocation_formula ->> 'decision' = 'distribute')
        or (p.status = 'approved' and p.allocation_formula ->> 'decision' = 'retain'))) then
      raise exception 'Record the final profit calculation and Committee decision before cycle closure';
    end if;
  end if;
  update public.group_cycles set status = next_status,
    ends_on = effective_end,
    opened_at = case when next_status = 'open' then coalesce(opened_at, now()) else opened_at end,
    closed_at = case when next_status in ('closed', 'archived') then now() else closed_at end
  where id = target_cycle and group_id = target_group;
  if next_status = 'closed' then
    update public.cycle_members set status = 'completed', ended_on = coalesce(ended_on, current_date)
    where group_id = target_group and cycle_id = target_cycle and status = 'active';
  end if;
  return target_cycle;
end;
$$;

-- The prior automatic share-weighted allocation was not an approved policy.
-- Profit is calculated only from posted interest and expenses explicitly funded
-- from profit. Member allocations require a recorded Committee decision.
create or replace function public.calculate_cycle_profit(target_group uuid, target_cycle uuid, profit_period date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare calculation_id uuid; period_start date; cycle_row public.group_cycles%rowtype;
begin
  if not public.has_group_permission(target_group, 'profit:calculate') then raise exception 'Profit calculation permission required'; end if;
  select * into cycle_row from public.group_cycles c where c.id = target_cycle and c.group_id = target_group;
  if not found then raise exception 'Cycle not found'; end if;
  period_start := case when profit_period is null then null else date_trunc('month', profit_period)::date end;
  if profit_period is null then
    if cycle_row.status not in ('closing', 'closed') then raise exception 'A final cycle calculation is available only during cycle closing'; end if;
    if exists (
      select 1 from generate_series(date_trunc('month', cycle_row.starts_on)::timestamp,
        date_trunc('month', cycle_row.ends_on)::timestamp, interval '1 month') as months(month_start)
      where not exists (select 1 from public.financial_period_closings f where f.group_id = target_group
        and f.cycle_id = target_cycle and f.period = months.month_start::date and f.status = 'closed')
    ) then raise exception 'Close every financial month before the final profit calculation'; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_cycle::text || coalesce(period_start::text, 'cycle-final'), 0));
  select id into calculation_id from public.profit_calculations p
  where p.group_id = target_group and p.cycle_id = target_cycle and p.period is not distinct from period_start
  order by p.created_at desc limit 1;
  if calculation_id is not null then return calculation_id; end if;
  with income_total as (
    select coalesce(sum(r.interest_amount), 0)::numeric(15,0) as total
    from public.loan_repayments r join public.loans l on l.id = r.loan_id
    where l.group_id = target_group and l.cycle_id = target_cycle and r.status = 'verified'
      and (period_start is null or date_trunc('month', r.received_at)::date = period_start)
  ), expense_total as (
    select coalesce(sum(e.amount), 0)::numeric(15,0) as total
    from public.expenses e where e.group_id = target_group and e.cycle_id = target_cycle
      and e.status = 'paid' and e.funding_source = 'profit' and e.category <> 'profit_distribution'
      and (period_start is null or date_trunc('month', e.spent_on)::date = period_start)
  )
  insert into public.profit_calculations(group_id, cycle_id, period, income, expenses, net_profit, allocation_formula, allocations, calculated_by)
  select target_group, target_cycle, period_start, income_total.total, expense_total.total,
    income_total.total - expense_total.total,
    jsonb_build_object('method', 'committee_decision_required', 'decision', null, 'formula', null),
    '[]'::jsonb, auth.uid()
  from income_total cross join expense_total returning id into calculation_id;
  return calculation_id;
end;
$$;

create or replace function public.record_committee_profit_decision(
  target_calculation uuid, decision_kind text, decision_reference text,
  decision_reason text, proposed_allocations jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare calculation public.profit_calculations%rowtype; item jsonb; member_key uuid; amount_value numeric;
  reference_value text; total_amount numeric := 0; normalized_allocations jsonb := '[]'::jsonb;
begin
  select * into calculation from public.profit_calculations where id = target_calculation for update;
  if not found then raise exception 'Profit calculation not found'; end if;
  if not public.has_group_permission(calculation.group_id, 'profit:distribute') then raise exception 'Committee profit-decision permission required'; end if;
  if calculation.status <> 'draft' then raise exception 'A Committee decision has already been recorded'; end if;
  if decision_kind is null or decision_kind not in ('distribute', 'retain')
     or char_length(btrim(coalesce(decision_reference, ''))) < 2
     or char_length(btrim(coalesce(decision_reason, ''))) < 5
     or proposed_allocations is null or jsonb_typeof(proposed_allocations) <> 'array' then
    raise exception 'Committee decision details are incomplete';
  end if;
  if decision_kind = 'retain' and jsonb_array_length(proposed_allocations) <> 0 then
    raise exception 'A retained-profit decision cannot include member payments';
  end if;
  if decision_kind = 'distribute' and (calculation.net_profit <= 0 or jsonb_array_length(proposed_allocations) = 0) then
    raise exception 'A positive cycle profit and member allocations are required';
  end if;
  for item in select value from jsonb_array_elements(proposed_allocations) as rows(value) loop
    member_key := (item ->> 'member_id')::uuid;
    amount_value := (item ->> 'amount')::numeric;
    reference_value := btrim(coalesce(item ->> 'reference', ''));
    if amount_value <= 0 or amount_value <> trunc(amount_value) or char_length(reference_value) < 3 then
      raise exception 'Each member allocation requires a positive whole-RWF amount and payment reference';
    end if;
    if not exists (select 1 from public.cycle_members cm where cm.group_id = calculation.group_id
      and cm.cycle_id = calculation.cycle_id and cm.member_id = member_key) then
      raise exception 'Every allocation must belong to a member of this cycle';
    end if;
    if exists (select 1 from public.expenses e where e.group_id = calculation.group_id and lower(btrim(e.reference)) = lower(reference_value)) then
      raise exception 'A payment reference has already been used in this Ikimina';
    end if;
    total_amount := total_amount + amount_value;
    normalized_allocations := normalized_allocations || jsonb_build_array(jsonb_build_object(
      'member_id', member_key, 'amount', amount_value, 'reference', reference_value
    ));
  end loop;
  if decision_kind = 'distribute' and total_amount <> calculation.net_profit then
    raise exception 'Member allocations must equal the approved profit exactly';
  end if;
  if (select count(*) from jsonb_array_elements(normalized_allocations)) <>
     (select count(distinct value ->> 'member_id') from jsonb_array_elements(normalized_allocations) as rows(value)) then
    raise exception 'Each cycle member can appear only once in a distribution';
  end if;
  update public.profit_calculations set status = 'approved', approved_by = auth.uid(),
    allocation_formula = jsonb_build_object('method', 'committee_explicit_decision', 'decision', decision_kind,
      'decision_reference', btrim(decision_reference), 'reason', btrim(decision_reason),
      'decided_by', auth.uid(), 'decided_at', now()),
    allocations = normalized_allocations
  where id = target_calculation;
  return target_calculation;
end;
$$;

create or replace function public.set_profit_calculation_status(target_calculation uuid, next_status text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare calculation public.profit_calculations%rowtype; distribution_total numeric; available_funds numeric;
begin
  select * into calculation from public.profit_calculations where id = target_calculation for update;
  if not found then raise exception 'Profit calculation not found'; end if;
  if next_status <> 'distributed' or calculation.status <> 'approved'
     or calculation.allocation_formula ->> 'method' is distinct from 'committee_explicit_decision'
     or calculation.allocation_formula ->> 'decision' is distinct from 'distribute'
     or not public.has_group_permission(calculation.group_id, 'profit:distribute') then
    raise exception 'Only an approved Committee distribution decision can be paid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(calculation.group_id::text, 0));
  select coalesce(sum((allocation ->> 'amount')::numeric), 0) into distribution_total
  from jsonb_array_elements(calculation.allocations) as allocation_rows(allocation);
  if distribution_total <> calculation.net_profit or distribution_total <= 0 then raise exception 'Approved allocations do not match the calculated profit'; end if;
  select available_balance into available_funds from public.savings_summary where group_id = calculation.group_id;
  if coalesce(available_funds, 0) < distribution_total then raise exception 'The group does not have enough available funds for this distribution'; end if;
  insert into public.expenses(group_id, cycle_id, category, description, funding_source, amount, spent_on, payment_method, reference, status, created_by, approved_by, approved_at, paid_at)
  select calculation.group_id, calculation.cycle_id, 'profit_distribution', 'Committee-approved profit distribution', 'profit',
    (allocation ->> 'amount')::numeric, current_date, 'other', allocation ->> 'reference', 'paid', auth.uid(), auth.uid(), now(), now()
  from jsonb_array_elements(calculation.allocations) as allocation_rows(allocation);
  update public.profit_calculations set status = 'distributed', distributed_at = now() where id = target_calculation;
  return target_calculation;
end;
$$;

revoke all on function public.record_committee_profit_decision(uuid,text,text,text,jsonb) from public, anon;
grant execute on function public.record_committee_profit_decision(uuid,text,text,text,jsonb) to authenticated;

-- Ordinary and social payments must consume the corresponding component of a
-- generated obligation. Unverified submissions reserve capacity so concurrent
-- duplicate submissions cannot overpay an obligation.
create or replace function public.guard_contribution_workflow()
returns trigger language plpgsql security definer set search_path = '' as $$
declare obligation_row public.contribution_obligations%rowtype; already_reserved numeric; applicable_due numeric;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.verified_by is not null or new.verified_at is not null then
      raise exception 'A contribution must start pending verification';
    end if;
    new.received_at := now();
    if new.contribution_type = 'special' then
      if new.obligation_id is not null or new.cycle_id is null or not public.has_group_permission(new.group_id, 'contributions:record') then
        raise exception 'Special contributions require an authorized treasurer entry and cannot be allocated to a monthly obligation';
      end if;
      if not exists (select 1 from public.group_cycles c where c.id = new.cycle_id and c.group_id = new.group_id and c.status = 'open') then
        raise exception 'Special contributions must belong to an open cycle';
      end if;
      return new;
    end if;
    if new.cycle_id is null or new.obligation_id is null then raise exception 'Regular and social payments must be attached to a generated monthly obligation'; end if;
    select * into obligation_row from public.contribution_obligations o
    where o.id = new.obligation_id and o.group_id = new.group_id and o.cycle_id = new.cycle_id
      and o.member_id = new.member_id and o.period = date_trunc('month', new.period)::date for update;
    if not found then raise exception 'The payment does not match this member’s contribution obligation'; end if;
    applicable_due := case when new.contribution_type = 'social' then obligation_row.social_due else obligation_row.savings_due end;
    select coalesce(sum(c.amount), 0) into already_reserved from public.contributions c
      where c.obligation_id = obligation_row.id and c.group_id = new.group_id
        and c.contribution_type = new.contribution_type and c.status in ('pending', 'verified');
    if already_reserved + new.amount > applicable_due then raise exception 'Payment exceeds the remaining amount due for this obligation'; end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.status = 'pending' and new.status = 'pending'
       and new.group_id is not distinct from old.group_id and new.cycle_id is not distinct from old.cycle_id
       and new.member_id is not distinct from old.member_id and new.direction is not distinct from old.direction
       and new.reference is not distinct from old.reference
       and new.verified_by is null and new.verified_at is null then
      if new.units <= 0 then raise exception 'Share quantity must be positive'; end if;
      if not (public.has_group_permission(new.group_id, 'shares:manage') or
        (new.direction = 'purchase' and exists (select 1 from public.members m where m.id = new.member_id
          and m.group_id = new.group_id and m.user_id = auth.uid() and m.status = 'active'))) then
        raise exception 'Only the member or an authorized share manager can update a pending purchase';
      end if;
      select * into cycle_row from public.group_cycles c where c.id = new.cycle_id
        and c.group_id = new.group_id and c.status = 'open' for share;
      if not found or current_date < cycle_row.starts_on or current_date > cycle_row.ends_on then
        raise exception 'The share selection cycle is no longer open';
      end if;
      new.unit_price := cycle_row.share_price;
      return new;
    end if;
    if old.status <> 'pending' or new.status not in ('verified', 'rejected')
       or new.group_id is distinct from old.group_id or new.member_id is distinct from old.member_id
       or new.cycle_id is distinct from old.cycle_id or new.obligation_id is distinct from old.obligation_id
       or new.amount is distinct from old.amount or new.contribution_type is distinct from old.contribution_type
       or new.period is distinct from old.period or new.reference is distinct from old.reference then
      raise exception 'A contribution review may only move once from pending to verified or rejected';
    end if;
    if not public.has_group_permission(new.group_id, 'contributions:verify')
       or new.verified_by is distinct from auth.uid() or new.verified_at is null then
      raise exception 'Contribution verification permission required';
    end if;
    return new;
  end if;
  raise exception 'Contributions are preserved; use the authorized correction workflow';
end;
$$;
drop trigger if exists contribution_workflow_guard on public.contributions;
create trigger contribution_workflow_guard
before insert or update or delete on public.contributions
for each row execute function public.guard_contribution_workflow();
revoke all on function public.guard_contribution_workflow() from public, anon, authenticated;

create unique index if not exists share_transaction_reference_unique
  on public.share_transactions(group_id, lower(btrim(reference)))
  where reference is not null and length(btrim(reference)) > 0;

create or replace function public.guard_share_transaction()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cycle_row public.group_cycles%rowtype; owned_units numeric;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.verified_by is not null or new.verified_at is not null then
      raise exception 'A share transaction must begin pending verification';
    end if;
    select * into cycle_row from public.group_cycles c where c.id = new.cycle_id
      and c.group_id = new.group_id and c.status = 'open' for share;
    if not found or current_date < cycle_row.starts_on or current_date > cycle_row.ends_on then
      raise exception 'Share transactions are available only during the configured cycle';
    end if;
    if not exists (select 1 from public.members m where m.id = new.member_id and m.group_id = new.group_id and m.status = 'active') then
      raise exception 'Share transactions require active membership';
    end if;
    if new.direction = 'sale' and not public.has_group_permission(new.group_id, 'shares:manage') then
      raise exception 'Only an authorized share manager can record a sale';
    end if;
    new.unit_price := cycle_row.share_price;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.status <> 'pending' or new.status not in ('verified', 'rejected')
       or new.group_id is distinct from old.group_id or new.cycle_id is distinct from old.cycle_id
       or new.member_id is distinct from old.member_id or new.direction is distinct from old.direction
       or new.units is distinct from old.units or new.unit_price is distinct from old.unit_price
       or new.reference is distinct from old.reference then
      raise exception 'A share review may only move once from pending to verified or rejected';
    end if;
    if not public.has_group_permission(new.group_id, 'shares:manage')
       or new.verified_by is distinct from auth.uid() or new.verified_at is null then
      raise exception 'Share verification permission required';
    end if;
    if new.direction = 'sale' and new.status = 'verified' then
      perform pg_advisory_xact_lock(hashtextextended(new.cycle_id::text || new.member_id::text, 0));
      select coalesce(sum(case when s.direction = 'purchase' then s.units else -s.units end), 0)
        into owned_units from public.share_transactions s where s.group_id = new.group_id
        and s.cycle_id = new.cycle_id and s.member_id = new.member_id and s.status = 'verified' and s.id <> new.id;
      if owned_units < new.units then raise exception 'A member cannot sell more shares than they own'; end if;
    end if;
    return new;
  end if;
  raise exception 'Share transactions are preserved; use an authorized correction process';
end;
$$;
drop trigger if exists share_transaction_guard on public.share_transactions;
create trigger share_transaction_guard
before insert or update or delete on public.share_transactions
for each row execute function public.guard_share_transaction();
revoke all on function public.guard_share_transaction() from public, anon, authenticated;
