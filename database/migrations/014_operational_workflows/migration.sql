-- Operational workflows extend the existing member, contribution, loan,
-- meeting, notification, and role model without replacing historical records.

insert into public.permissions (permission_key, label, permission_domain) values
  ('cycles:read', 'View Ikimina cycles', 'administrative'),
  ('shares:read', 'View share ownership', 'financial'),
  ('obligations:read', 'View contribution obligations', 'financial'),
  ('obligations:manage', 'Generate and manage contribution obligations', 'financial'),
  ('payments:read', 'View payment transactions', 'financial'),
  ('payments:record', 'Record payment transactions', 'financial'),
  ('payments:verify', 'Verify payment transactions', 'financial'),
  ('reconciliation:manage', 'Reconcile bank and ledger transactions', 'financial'),
  ('expenses:read', 'View group expenses', 'financial'),
  ('expenses:manage', 'Record and pay group expenses', 'financial'),
  ('expenses:approve', 'Approve or reject group expenses', 'financial'),
  ('repayments:submit', 'Submit a personal loan repayment', 'financial'),
  ('repayments:verify', 'Verify submitted loan repayments', 'financial'),
  ('interest:read', 'View loan interest charges', 'financial'),
  ('interest:calculate', 'Calculate monthly loan interest', 'financial'),
  ('social_fund:decide', 'Approve social assistance requests', 'financial'),
  ('closing:read', 'View financial month closings', 'financial'),
  ('closing:manage', 'Review and close financial months', 'financial'),
  ('corrections:request', 'Request a correction to closed financial data', 'financial'),
  ('corrections:approve', 'Approve controlled financial corrections', 'financial'),
  ('analytics:read', 'View group performance analytics', 'financial'),
  ('members:invite', 'Invite people to join the Ikimina', 'administrative'),
  ('meetings:vote', 'Vote on authorized meeting decisions', 'administrative'),
  ('messages:moderate', 'Moderate group conversations', 'administrative')
on conflict (permission_key) do nothing;

insert into public.role_permissions (role_key, permission_key)
select mapping.role_key, mapping.permission_key
from (values
  ('chairperson', 'cycles:read'), ('chairperson', 'shares:read'), ('chairperson', 'obligations:read'),
  ('chairperson', 'expenses:read'), ('chairperson', 'expenses:approve'), ('chairperson', 'social_fund:decide'),
  ('chairperson', 'closing:read'), ('chairperson', 'closing:manage'), ('chairperson', 'corrections:request'),
  ('chairperson', 'corrections:approve'), ('chairperson', 'analytics:read'), ('chairperson', 'members:invite'),
  ('chairperson', 'meetings:vote'), ('chairperson', 'messages:moderate'),
  ('committee_member', 'cycles:read'), ('committee_member', 'shares:read'), ('committee_member', 'obligations:read'),
  ('committee_member', 'expenses:read'), ('committee_member', 'expenses:approve'), ('committee_member', 'social_fund:decide'),
  ('committee_member', 'closing:read'), ('committee_member', 'closing:manage'), ('committee_member', 'corrections:approve'),
  ('committee_member', 'analytics:read'), ('committee_member', 'meetings:vote'),
  ('group_administrator', 'cycles:read'), ('group_administrator', 'members:invite'),
  ('treasurer', 'shares:read'), ('treasurer', 'obligations:read'), ('treasurer', 'obligations:manage'),
  ('treasurer', 'payments:read'), ('treasurer', 'payments:record'), ('treasurer', 'payments:verify'),
  ('treasurer', 'reconciliation:manage'), ('treasurer', 'expenses:read'), ('treasurer', 'expenses:manage'),
  ('treasurer', 'repayments:verify'), ('treasurer', 'interest:read'), ('treasurer', 'interest:calculate'),
  ('treasurer', 'closing:read'), ('treasurer', 'closing:manage'), ('treasurer', 'corrections:request'),
  ('treasurer', 'analytics:read'),
  ('secretary', 'cycles:read'), ('secretary', 'members:invite'), ('secretary', 'meetings:vote'),
  ('system_administrator', 'cycles:read'), ('system_administrator', 'cycles:manage'), ('system_administrator', 'closing:read'),
  ('technician', 'cycles:read'),
  ('security_administrator', 'cycles:read'),
  ('super_administrator', 'cycles:read'), ('super_administrator', 'shares:read'),
  ('super_administrator', 'obligations:read'), ('super_administrator', 'obligations:manage'),
  ('super_administrator', 'payments:read'), ('super_administrator', 'payments:record'),
  ('super_administrator', 'payments:verify'), ('super_administrator', 'reconciliation:manage'),
  ('super_administrator', 'expenses:read'), ('super_administrator', 'expenses:manage'),
  ('super_administrator', 'expenses:approve'), ('super_administrator', 'repayments:submit'),
  ('super_administrator', 'repayments:verify'), ('super_administrator', 'interest:read'),
  ('super_administrator', 'interest:calculate'), ('super_administrator', 'social_fund:decide'),
  ('super_administrator', 'closing:read'), ('super_administrator', 'closing:manage'),
  ('super_administrator', 'corrections:request'), ('super_administrator', 'corrections:approve'),
  ('super_administrator', 'analytics:read'), ('super_administrator', 'members:invite'),
  ('super_administrator', 'meetings:vote'), ('super_administrator', 'messages:moderate')
) as mapping(role_key, permission_key)
on conflict do nothing;

create table public.group_cycles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  cycle_number integer not null check (cycle_number > 0),
  name text not null check (char_length(name) between 2 and 120),
  starts_on date not null,
  ends_on date not null,
  share_price numeric(15,0) not null default 0 check (share_price >= 0),
  contribution_amount numeric(15,0) not null check (contribution_amount >= 0),
  contribution_due_day smallint not null default 5 check (contribution_due_day between 1 and 28),
  late_penalty numeric(15,0) not null default 0 check (late_penalty >= 0),
  loan_limit numeric(15,0) check (loan_limit is null or loan_limit >= 0),
  rules jsonb not null default '{}'::jsonb check (jsonb_typeof(rules) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'open', 'closing', 'closed', 'archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  closed_at timestamptz,
  unique (group_id, cycle_number),
  unique (group_id, id),
  check (ends_on >= starts_on)
);
create unique index group_cycles_one_open_per_group on public.group_cycles(group_id) where status = 'open';
create index group_cycles_group_dates_idx on public.group_cycles(group_id, starts_on desc);

create table public.cycle_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  cycle_id uuid not null,
  member_id uuid not null,
  status text not null default 'active' check (status in ('active', 'withdrawn', 'completed')),
  joined_on date not null default current_date,
  ended_on date,
  created_at timestamptz not null default now(),
  unique (cycle_id, member_id),
  foreign key (group_id, cycle_id) references public.group_cycles(group_id, id) on delete cascade,
  foreign key (group_id, member_id) references public.members(group_id, id) on delete restrict
);

create or replace function public.sync_open_cycle_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'active' then
    insert into public.cycle_members(group_id, cycle_id, member_id)
    select new.group_id, c.id, new.id from public.group_cycles c
    where c.group_id = new.group_id and c.status = 'open'
    on conflict (cycle_id, member_id) do update set status = 'active', ended_on = null;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status <> 'active' then
      update public.cycle_members cm set status = 'withdrawn', ended_on = current_date
      from public.group_cycles c
      where cm.cycle_id = c.id and cm.group_id = c.group_id and cm.group_id = new.group_id
        and cm.member_id = new.id and cm.status = 'active' and c.status = 'open';
    else
      insert into public.cycle_members(group_id, cycle_id, member_id)
      select new.group_id, c.id, new.id from public.group_cycles c
      where c.group_id = new.group_id and c.status = 'open'
      on conflict (cycle_id, member_id) do update set status = 'active', ended_on = null;
    end if;
  end if;
  return new;
end;
$$;
create trigger sync_member_open_cycle after insert or update of status on public.members
for each row execute function public.sync_open_cycle_membership();

create table public.contribution_obligations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  cycle_id uuid not null,
  member_id uuid not null,
  period date not null,
  due_on date not null,
  amount_due numeric(15,0) not null check (amount_due >= 0),
  penalty_amount numeric(15,0) not null default 0 check (penalty_amount >= 0),
  status text not null default 'due' check (status in ('due', 'partially_paid', 'paid', 'waived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (cycle_id, member_id, period),
  unique (group_id, id),
  foreign key (group_id, cycle_id) references public.group_cycles(group_id, id) on delete cascade,
  foreign key (group_id, member_id) references public.members(group_id, id) on delete restrict,
  check (extract(day from period) = 1)
);
create index contribution_obligations_group_period_idx on public.contribution_obligations(group_id, period desc);
alter table public.contributions add column cycle_id uuid;
alter table public.contributions add column obligation_id uuid;
alter table public.contributions add column payment_method text not null default 'other'
  check (payment_method in ('cash', 'bank', 'mobile_money', 'other'));
alter table public.contributions add constraint contributions_cycle_fk
  foreign key (group_id, cycle_id) references public.group_cycles(group_id, id) on delete restrict;
alter table public.contributions add constraint contributions_obligation_fk
  foreign key (group_id, obligation_id) references public.contribution_obligations(group_id, id) on delete restrict;

create table public.share_transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  cycle_id uuid not null,
  member_id uuid not null,
  direction text not null check (direction in ('purchase', 'sale')),
  units numeric(12,2) not null check (units > 0),
  unit_price numeric(15,0) not null check (unit_price >= 0),
  amount numeric(15,0) generated always as (round(units * unit_price)) stored,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  reference text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (group_id, cycle_id) references public.group_cycles(group_id, id) on delete restrict,
  foreign key (group_id, member_id) references public.members(group_id, id) on delete restrict
);
create index share_transactions_member_idx on public.share_transactions(group_id, member_id, created_at desc);

create table public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  account_label text not null check (char_length(account_label) between 1 and 120),
  transaction_date timestamptz not null,
  description text not null check (char_length(description) between 1 and 500),
  amount numeric(15,0) not null check (amount <> 0),
  reference text not null check (char_length(reference) between 1 and 160),
  matched_entity text check (matched_entity in ('contributions', 'loan_repayments', 'expenses', 'share_transactions')),
  matched_entity_id uuid,
  status text not null default 'unmatched' check (status in ('unmatched', 'matched', 'reconciled', 'ignored')),
  imported_by uuid not null references public.profiles(id) on delete restrict,
  reconciled_by uuid references public.profiles(id) on delete set null,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, account_label, reference),
  check ((status in ('unmatched', 'ignored') and matched_entity is null and matched_entity_id is null)
      or (status in ('matched', 'reconciled') and matched_entity is not null and matched_entity_id is not null))
);
create index bank_transactions_reconcile_idx on public.bank_transactions(group_id, status, transaction_date desc);

create table public.social_fund_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  member_id uuid not null,
  amount_requested numeric(15,0) not null check (amount_requested > 0),
  reason text not null check (char_length(reason) between 5 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'disbursed', 'cancelled')),
  decision_note text,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  disbursed_at timestamptz,
  disbursement_reference text,
  created_at timestamptz not null default now(),
  foreign key (group_id, member_id) references public.members(group_id, id) on delete restrict
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  cycle_id uuid,
  category text not null check (category in ('operations', 'meeting', 'social_fund', 'profit_distribution', 'other')),
  description text not null check (char_length(description) between 3 and 1000),
  funding_source text not null check (funding_source in ('group', 'social_fund', 'profit')),
  amount numeric(15,0) not null check (amount > 0),
  spent_on date not null,
  payment_method text not null default 'other' check (payment_method in ('cash', 'bank', 'mobile_money', 'other')),
  reference text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (group_id, cycle_id) references public.group_cycles(group_id, id) on delete restrict,
  check (funding_source <> 'social_fund' or category = 'social_fund')
);
create index expenses_group_date_idx on public.expenses(group_id, spent_on desc);
create unique index expenses_profit_distribution_ref_idx on public.expenses(reference) where reference like 'profit:%';

create table public.loan_interest_charges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete restrict,
  period date not null,
  due_on date not null,
  principal_basis numeric(15,0) not null check (principal_basis >= 0),
  rate numeric(5,2) not null check (rate between 0 and 100),
  amount numeric(15,0) not null check (amount >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (loan_id, period),
  check (extract(day from period) = 1)
);
alter table public.loans add column outstanding_interest numeric(15,0) not null default 0 check (outstanding_interest >= 0);
alter table public.loans add column is_draft boolean not null default false;
alter table public.loans add column rejection_reason text;
alter table public.loans add column disbursement_reference text;
alter table public.loans add column disbursed_at timestamptz;
alter table public.loan_repayments add column group_id uuid;
alter table public.loan_repayments add column principal_amount numeric(15,0) not null default 0 check (principal_amount >= 0);
alter table public.loan_repayments add column interest_amount numeric(15,0) not null default 0 check (interest_amount >= 0);
alter table public.loan_repayments add column status text not null default 'verified' check (status in ('pending', 'verified', 'rejected'));
alter table public.loan_repayments add column created_by uuid references public.profiles(id) on delete set null;
alter table public.loan_repayments add column verified_by uuid references public.profiles(id) on delete set null;
alter table public.loan_repayments add column verified_at timestamptz;
alter table public.loan_repayments add column payment_method text not null default 'other' check (payment_method in ('cash', 'bank', 'mobile_money', 'other'));
update public.loan_repayments r
set group_id = l.group_id, principal_amount = r.amount, created_by = r.received_by,
    verified_by = r.received_by, verified_at = r.received_at
from public.loans l where l.id = r.loan_id;
alter table public.loan_repayments alter column group_id set not null;
alter table public.loan_repayments add constraint loan_repayments_group_fk foreign key (group_id) references public.groups(id) on delete cascade;
create unique index loan_repayments_reference_unique on public.loan_repayments(group_id, payment_method, reference)
  where reference is not null and length(btrim(reference)) > 0;
create index loan_repayments_group_status_idx on public.loan_repayments(group_id, status, received_at desc);

create table public.financial_period_closings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  cycle_id uuid,
  period date not null,
  status text not null default 'review' check (status in ('review', 'closed', 'reopened')),
  snapshot jsonb not null default '{}'::jsonb,
  prepared_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  prepared_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (group_id, period),
  -- group_id is required, so a composite SET NULL delete would try to null it too.
  foreign key (group_id, cycle_id) references public.group_cycles(group_id, id) on delete restrict,
  check (extract(day from period) = 1)
);

create table public.financial_correction_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  closing_id uuid not null references public.financial_period_closings(id) on delete restrict,
  entity text not null check (entity in ('contributions', 'loans', 'loan_repayments', 'expenses', 'share_transactions')),
  entity_id uuid not null,
  reason text not null check (char_length(reason) between 5 and 2000),
  proposed_values jsonb not null check (jsonb_typeof(proposed_values) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'applied')),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  decided_by uuid references public.profiles(id) on delete set null,
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table public.profit_calculations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  cycle_id uuid not null,
  period date,
  income numeric(15,0) not null default 0,
  expenses numeric(15,0) not null default 0,
  net_profit numeric(15,0) not null,
  allocation_formula jsonb not null default '{}'::jsonb,
  allocations jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'distributed')),
  calculated_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  distributed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (group_id, cycle_id) references public.group_cycles(group_id, id) on delete restrict
);

alter table public.meetings add column minutes text;
drop policy if exists meetings_manage_authorized on public.meetings;
create policy meetings_insert_authorized on public.meetings for insert to authenticated with check (
  created_by = auth.uid() and public.has_group_permission(group_id, 'meetings:manage')
);
create policy meetings_update_authorized on public.meetings for update to authenticated
  using (public.has_group_permission(group_id, 'meetings:manage'))
  with check (public.has_group_permission(group_id, 'meetings:manage'));
create table public.meeting_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 240),
  description text,
  voting_open boolean not null default false,
  voting_closes_at timestamptz,
  outcome text check (outcome in ('approved', 'rejected', 'deferred')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.meeting_votes (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.meeting_decisions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  vote text not null check (vote in ('yes', 'no', 'abstain')),
  cast_at timestamptz not null default now(),
  unique (decision_id, member_id)
);
create table public.meeting_documents (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  storage_path text not null check (char_length(storage_path) between 1 and 500),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);
create table public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  kind text not null check (kind in ('private', 'official', 'committee', 'group')),
  title text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.chat_thread_members (
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 5000),
  edited_at timestamptz,
  deleted_at timestamptz,
  moderated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index chat_messages_thread_created_idx on public.chat_messages(thread_id, created_at desc);

create table public.group_announcements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  body text not null check (char_length(body) between 1 and 5000),
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.group_system_controls (
  group_id uuid primary key references public.groups(id) on delete cascade,
  status text not null default 'normal' check (status in ('normal', 'limited', 'maintenance', 'locked')),
  message text,
  disabled_modules text[] not null default '{}',
  changed_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Members can submit a repayment claim. Only an authorized financial officer
-- verifies it; only verified amounts alter loan balances.
drop trigger if exists loan_repayments_apply on public.loan_repayments;
update public.loan_repayments set status = 'verified' where status is null;
create or replace function public.apply_loan_repayment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare payment_amount numeric;
begin
  if new.status = 'verified' then
    if tg_op = 'UPDATE' and old.status = 'verified' then return new; end if;
    if new.amount <> new.principal_amount + new.interest_amount then
      raise exception 'Repayment total must equal its principal and interest parts';
    end if;
    update public.loans
    set outstanding_amount = outstanding_amount - new.principal_amount,
        outstanding_interest = outstanding_interest - new.interest_amount,
        status = case when outstanding_amount = new.principal_amount and outstanding_interest = new.interest_amount then 'repaid'::public.loan_status else status end
    where id = new.loan_id and group_id = new.group_id and status in ('active', 'defaulted')
      and outstanding_amount >= new.principal_amount and outstanding_interest >= new.interest_amount;
    if not found then raise exception 'Repayment exceeds the outstanding principal or interest, or the loan is not active'; end if;
  end if;
  return new;
end;
$$;
create trigger loan_repayments_apply after insert or update of status on public.loan_repayments
for each row execute function public.apply_loan_repayment();

create or replace function public.guard_loan_repayment_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status <> 'pending' or new.status not in ('verified', 'rejected') then
    raise exception 'A repayment review can only move once from pending to verified or rejected';
  end if;
  if not public.has_group_permission(new.group_id, 'repayments:verify') or new.verified_by is distinct from auth.uid() then
    raise exception 'Loan-repayment verification permission required';
  end if;
  if new.status = 'verified' and new.amount <> new.principal_amount + new.interest_amount then
    raise exception 'Repayment total must equal its principal and interest parts';
  end if;
  return new;
end;
$$;
create trigger loan_repayment_status_guard before update of status on public.loan_repayments
for each row execute function public.guard_loan_repayment_status();

create or replace function public.create_group_cycle(
  target_group uuid, cycle_name text, cycle_start date, cycle_end date,
  share_unit_price numeric, monthly_contribution numeric, due_day smallint,
  late_penalty_amount numeric, max_loan numeric, business_rules jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare next_number integer; new_cycle uuid;
begin
  if not public.has_group_permission(target_group, 'cycles:manage') then raise exception 'Cycle management permission required'; end if;
  if cycle_end < cycle_start or jsonb_typeof(business_rules) <> 'object' then raise exception 'Cycle rules or date range are invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_group::text, 0));
  select coalesce(max(cycle_number), 0) + 1 into next_number from public.group_cycles where group_id = target_group;
  insert into public.group_cycles(group_id, cycle_number, name, starts_on, ends_on, share_price, contribution_amount, contribution_due_day, late_penalty, loan_limit, rules, created_by)
  values (target_group, next_number, cycle_name, cycle_start, cycle_end, share_unit_price, monthly_contribution, due_day, late_penalty_amount, max_loan, business_rules, auth.uid())
  returning id into new_cycle;
  insert into public.cycle_members(group_id, cycle_id, member_id)
  select target_group, new_cycle, m.id from public.members m where m.group_id = target_group and m.status = 'active';
  return new_cycle;
end;
$$;

create or replace function public.set_group_cycle_status(target_group uuid, target_cycle uuid, next_status text, cycle_end date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare prior_status text;
begin
  if not public.has_group_permission(target_group, 'cycles:manage') then raise exception 'Cycle management permission required'; end if;
  select status into prior_status from public.group_cycles where id = target_cycle and group_id = target_group for update;
  if prior_status is null then raise exception 'Cycle not found'; end if;
  if not ((prior_status = 'draft' and next_status = 'open') or (prior_status = 'open' and next_status in ('closing', 'closed')) or (prior_status = 'closing' and next_status in ('open', 'closed')) or (prior_status = 'closed' and next_status = 'archived')) then
    raise exception 'Invalid cycle state transition';
  end if;
  update public.group_cycles set status = next_status,
    ends_on = coalesce(cycle_end, ends_on), opened_at = case when next_status = 'open' then coalesce(opened_at, now()) else opened_at end,
    closed_at = case when next_status in ('closed', 'archived') then now() else closed_at end
  where id = target_cycle and group_id = target_group;
  if next_status = 'closed' then
    update public.cycle_members set status = 'completed', ended_on = coalesce(ended_on, current_date)
    where group_id = target_group and cycle_id = target_cycle and status = 'active';
  end if;
  return target_cycle;
end;
$$;

create or replace function public.generate_monthly_obligations(target_group uuid, target_cycle uuid, obligation_period date)
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer; period_start date;
begin
  if not public.has_group_permission(target_group, 'obligations:manage') then raise exception 'Contribution-obligation permission required'; end if;
  period_start := date_trunc('month', obligation_period)::date;
  insert into public.contribution_obligations(group_id, cycle_id, member_id, period, due_on, amount_due, created_by)
  select c.group_id, c.id, cm.member_id, period_start,
    make_date(extract(year from period_start)::integer, extract(month from period_start)::integer, c.contribution_due_day),
    c.contribution_amount, auth.uid()
  from public.group_cycles c join public.cycle_members cm on cm.cycle_id = c.id and cm.group_id = c.group_id
  where c.id = target_cycle and c.group_id = target_group and c.status = 'open'
    and period_start between date_trunc('month', c.starts_on)::date and date_trunc('month', c.ends_on)::date
    and cm.status = 'active'
  on conflict (cycle_id, member_id, period) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

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
      l.outstanding_amount, l.interest_rate,
      round(l.outstanding_amount * l.interest_rate / 1200)::numeric(15,0), auth.uid()
    from public.loans l
  where l.group_id = target_group and l.status in ('active', 'defaulted') and l.outstanding_amount > 0
    on conflict (loan_id, period) do nothing
    returning loan_id, amount
  ), updated as (
    update public.loans l
    set outstanding_interest = l.outstanding_interest + added.amount
    from added
    where l.id = added.loan_id
    returning l.id
  )
  select count(*)::integer into inserted_count from updated;
  return inserted_count;
end;
$$;

create or replace function public.close_financial_month(target_group uuid, closing_period date, target_cycle uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare close_id uuid; period_start date; report_snapshot jsonb;
begin
  if not public.has_group_permission(target_group, 'closing:manage') then raise exception 'Financial closing permission required'; end if;
  period_start := date_trunc('month', closing_period)::date;
  if exists (select 1 from public.contributions c where c.group_id = target_group and date_trunc('month', c.period)::date = period_start and c.status = 'pending') then
    raise exception 'Pending contribution reviews must be resolved before closing the month';
  end if;
  if exists (select 1 from public.loan_repayments r where r.group_id = target_group and date_trunc('month', r.received_at)::date = period_start and r.status = 'pending') then
    raise exception 'Pending loan repayments must be resolved before closing the month';
  end if;
  if exists (select 1 from public.expenses e where e.group_id = target_group and date_trunc('month', e.spent_on)::date = period_start and e.status = 'pending') then
    raise exception 'Pending expense approvals must be resolved before closing the month';
  end if;
  select jsonb_build_object(
    'verified_contributions', coalesce((select sum(amount) from public.contributions where group_id = target_group and status = 'verified' and date_trunc('month', period)::date = period_start), 0),
    'principal_outstanding', coalesce((select sum(outstanding_amount) from public.loans where group_id = target_group and status in ('active', 'approved')), 0),
    'interest_outstanding', coalesce((select sum(outstanding_interest) from public.loans where group_id = target_group and status in ('active', 'approved')), 0),
    'paid_expenses', coalesce((select sum(amount) from public.expenses where group_id = target_group and status = 'paid' and date_trunc('month', spent_on)::date = period_start), 0),
    'unmatched_bank_transactions', (select count(*) from public.bank_transactions where group_id = target_group and status = 'unmatched')
  ) into report_snapshot;
  insert into public.financial_period_closings(group_id, cycle_id, period, status, snapshot, prepared_by, approved_by, closed_at)
  values (target_group, target_cycle, period_start, 'closed', report_snapshot, auth.uid(), auth.uid(), now())
  on conflict (group_id, period) do update set cycle_id = excluded.cycle_id, status = 'closed', snapshot = excluded.snapshot, approved_by = auth.uid(), closed_at = now()
  returning id into close_id;
  return close_id;
end;
$$;

create or replace function public.request_group_join(target_group uuid, request_message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if public.is_group_member(target_group) then raise exception 'You are already an active member'; end if;
  insert into public.join_requests(group_id, user_id, message)
  values (target_group, auth.uid(), request_message)
  on conflict (group_id, user_id) do update set status = 'pending', message = excluded.message, reviewed_by = null, reviewed_at = null
  returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.create_chat_thread(target_group uuid, thread_kind text, thread_title text, participant_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_thread uuid; participant uuid;
begin
  if thread_kind not in ('private', 'official', 'committee', 'group') then raise exception 'Invalid conversation type'; end if;
  if not public.has_group_permission(target_group, 'communications:send') then raise exception 'Communication permission required'; end if;
  if cardinality(participant_ids) < 1 or cardinality(participant_ids) > 50 then raise exception 'Choose between one and fifty participants'; end if;
  if thread_kind in ('committee', 'official') and not public.has_group_permission(target_group, 'announcements:manage') then raise exception 'Official and committee conversations require an authorized official'; end if;
  if exists (
    select 1 from unnest(participant_ids) as participants(user_id)
    where not (
      participants.user_id = auth.uid()
      or exists (select 1 from public.members m where m.group_id = target_group and m.user_id = participants.user_id and m.status = 'active')
      or public.has_group_permission(target_group, 'communications:read')
    )
  ) then
    raise exception 'Every conversation participant must be authorized for this Ikimina';
  end if;
  insert into public.chat_threads(group_id, kind, title, created_by) values (target_group, thread_kind, nullif(btrim(thread_title), ''), auth.uid()) returning id into new_thread;
  insert into public.chat_thread_members(thread_id, user_id) select new_thread, distinct_ids.user_id from (select distinct unnest(participant_ids) as user_id union select auth.uid()) distinct_ids;
  if thread_kind = 'group' then
    insert into public.chat_thread_members(thread_id, user_id)
    select new_thread, m.user_id from public.members m where m.group_id = target_group and m.status = 'active' and m.user_id is not null
    on conflict do nothing;
  end if;
  return new_thread;
end;
$$;

-- Permission-backed reads and writes. Own-record access is explicit and does
-- not confer access to another member's financial data.
alter table public.group_cycles enable row level security;
alter table public.cycle_members enable row level security;
alter table public.contribution_obligations enable row level security;
alter table public.share_transactions enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.social_fund_requests enable row level security;
alter table public.expenses enable row level security;
alter table public.loan_interest_charges enable row level security;
alter table public.financial_period_closings enable row level security;
alter table public.financial_correction_requests enable row level security;
alter table public.profit_calculations enable row level security;
alter table public.meeting_decisions enable row level security;
alter table public.meeting_votes enable row level security;
alter table public.meeting_documents enable row level security;
alter table public.join_requests enable row level security;
alter table public.group_invitations enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_thread_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.group_announcements enable row level security;
alter table public.group_system_controls enable row level security;

create policy group_cycles_read on public.group_cycles for select to authenticated using (public.is_group_member(group_id) or public.has_group_permission(group_id, 'cycles:read') or public.has_group_permission(group_id, 'cycles:manage'));
create policy group_cycles_write on public.group_cycles for all to authenticated using (public.has_group_permission(group_id, 'cycles:manage')) with check (public.has_group_permission(group_id, 'cycles:manage'));
create policy cycle_members_read on public.cycle_members for select to authenticated using (public.has_group_permission(group_id, 'members:read') or exists (select 1 from public.members m where m.id = cycle_members.member_id and m.user_id = auth.uid()));
create policy cycle_members_manage on public.cycle_members for all to authenticated using (public.has_group_permission(group_id, 'cycles:manage')) with check (public.has_group_permission(group_id, 'cycles:manage'));
create policy obligations_read on public.contribution_obligations for select to authenticated using (public.has_group_permission(group_id, 'obligations:read') or exists (select 1 from public.members m where m.id = contribution_obligations.member_id and m.user_id = auth.uid()));
create policy obligations_manage on public.contribution_obligations for all to authenticated using (public.has_group_permission(group_id, 'obligations:manage')) with check (public.has_group_permission(group_id, 'obligations:manage'));
create policy shares_read on public.share_transactions for select to authenticated using (public.has_group_permission(group_id, 'shares:read') or public.has_group_permission(group_id, 'financial:read') or exists (select 1 from public.members m where m.id = share_transactions.member_id and m.user_id = auth.uid()));
create policy shares_insert on public.share_transactions for insert to authenticated with check (created_by = auth.uid() and (public.has_group_permission(group_id, 'shares:manage') or exists (select 1 from public.members m where m.id = share_transactions.member_id and m.user_id = auth.uid() and share_transactions.direction = 'purchase')));
create policy shares_verify on public.share_transactions for update to authenticated using (public.has_group_permission(group_id, 'shares:manage')) with check (public.has_group_permission(group_id, 'shares:manage'));
create policy bank_transactions_read on public.bank_transactions for select to authenticated using (public.has_group_permission(group_id, 'payments:read') or public.has_group_permission(group_id, 'reconciliation:manage'));
create policy bank_transactions_insert on public.bank_transactions for insert to authenticated with check (imported_by = auth.uid() and public.has_group_permission(group_id, 'payments:record'));
create policy bank_transactions_reconcile on public.bank_transactions for update to authenticated using (public.has_group_permission(group_id, 'reconciliation:manage')) with check (public.has_group_permission(group_id, 'reconciliation:manage'));
create policy social_requests_read on public.social_fund_requests for select to authenticated using (public.has_group_permission(group_id, 'social_fund:read') or exists (select 1 from public.members m where m.id = social_fund_requests.member_id and m.user_id = auth.uid()));
create policy social_requests_insert on public.social_fund_requests for insert to authenticated with check (requested_by = auth.uid() and exists (select 1 from public.members m where m.id = social_fund_requests.member_id and m.user_id = auth.uid() and m.status = 'active'));
create policy social_requests_decide on public.social_fund_requests for update to authenticated using (public.has_group_permission(group_id, 'social_fund:decide') or public.has_group_permission(group_id, 'social_fund:manage')) with check (public.has_group_permission(group_id, 'social_fund:decide') or public.has_group_permission(group_id, 'social_fund:manage'));
create policy expenses_read on public.expenses for select to authenticated using (public.has_group_permission(group_id, 'expenses:read') or public.has_group_permission(group_id, 'expenses:manage') or public.has_group_permission(group_id, 'expenses:approve') or public.has_group_permission(group_id, 'financial:read'));
create policy expenses_insert on public.expenses for insert to authenticated with check (created_by = auth.uid() and public.has_group_permission(group_id, 'expenses:manage'));
create policy expenses_approve on public.expenses for update to authenticated using (public.has_group_permission(group_id, 'expenses:approve') or public.has_group_permission(group_id, 'expenses:manage')) with check (public.has_group_permission(group_id, 'expenses:approve') or public.has_group_permission(group_id, 'expenses:manage'));
create policy interest_read on public.loan_interest_charges for select to authenticated using (public.has_group_permission(group_id, 'interest:read') or public.has_group_permission(group_id, 'financial:read') or exists (select 1 from public.loans l join public.members m on m.id = l.member_id where l.id = loan_interest_charges.loan_id and m.user_id = auth.uid()));
create policy closings_read on public.financial_period_closings for select to authenticated using (public.has_group_permission(group_id, 'closing:read') or public.has_group_permission(group_id, 'closing:manage'));
create policy closings_manage on public.financial_period_closings for all to authenticated using (public.has_group_permission(group_id, 'closing:manage')) with check (public.has_group_permission(group_id, 'closing:manage'));
create policy corrections_read on public.financial_correction_requests for select to authenticated using (requested_by = auth.uid() or public.has_group_permission(group_id, 'corrections:approve') or public.has_group_permission(group_id, 'financial_audit:read'));
create policy corrections_insert on public.financial_correction_requests for insert to authenticated with check (requested_by = auth.uid() and public.has_group_permission(group_id, 'corrections:request'));
create policy corrections_decide on public.financial_correction_requests for update to authenticated using (public.has_group_permission(group_id, 'corrections:approve')) with check (public.has_group_permission(group_id, 'corrections:approve'));
create policy profits_read on public.profit_calculations for select to authenticated using (public.has_group_permission(group_id, 'profit:calculate') or public.has_group_permission(group_id, 'profit:distribute'));
create policy profits_manage on public.profit_calculations for all to authenticated using (public.has_group_permission(group_id, 'profit:calculate') or public.has_group_permission(group_id, 'profit:distribute')) with check (public.has_group_permission(group_id, 'profit:calculate') or public.has_group_permission(group_id, 'profit:distribute'));

create policy meeting_decisions_read on public.meeting_decisions for select to authenticated using (exists (select 1 from public.meetings m where m.id = meeting_decisions.meeting_id and (public.is_group_member(m.group_id) or public.has_group_permission(m.group_id, 'meetings:read'))));
create policy meeting_decisions_insert on public.meeting_decisions for insert to authenticated with check (created_by = auth.uid() and exists (select 1 from public.meetings m where m.id = meeting_decisions.meeting_id and public.has_group_permission(m.group_id, 'meetings:manage')));
create policy meeting_decisions_update on public.meeting_decisions for update to authenticated
  using (created_by = auth.uid() and exists (select 1 from public.meetings m where m.id = meeting_decisions.meeting_id and public.has_group_permission(m.group_id, 'meetings:manage'))
    and not exists (select 1 from public.meeting_votes v where v.decision_id = meeting_decisions.id))
  with check (created_by = auth.uid() and exists (select 1 from public.meetings m where m.id = meeting_decisions.meeting_id and public.has_group_permission(m.group_id, 'meetings:manage')));
create policy meeting_votes_read on public.meeting_votes for select to authenticated using (member_id in (select id from public.members where user_id = auth.uid()) or exists (select 1 from public.meeting_decisions d join public.meetings m on m.id = d.meeting_id where d.id = meeting_votes.decision_id and public.has_group_permission(m.group_id, 'meetings:manage')));
create policy meeting_votes_insert on public.meeting_votes for insert to authenticated with check (exists (select 1 from public.members member_row join public.meeting_decisions d on d.id = meeting_votes.decision_id join public.meetings m on m.id = d.meeting_id where member_row.id = meeting_votes.member_id and member_row.user_id = auth.uid() and member_row.status = 'active' and member_row.group_id = m.group_id and d.voting_open and (d.voting_closes_at is null or d.voting_closes_at > now())));
create policy meeting_documents_read on public.meeting_documents for select to authenticated using (exists (select 1 from public.meetings m where m.id = meeting_documents.meeting_id and (public.is_group_member(m.group_id) or public.has_group_permission(m.group_id, 'meetings:read'))));
create policy meeting_documents_manage on public.meeting_documents for all to authenticated using (exists (select 1 from public.meetings m where m.id = meeting_documents.meeting_id and public.has_group_permission(m.group_id, 'meetings:manage'))) with check (uploaded_by = auth.uid() and exists (select 1 from public.meetings m where m.id = meeting_documents.meeting_id and public.has_group_permission(m.group_id, 'meetings:manage')));

-- Social-fund approvers also need read access to the requests they decide.
drop policy social_requests_read on public.social_fund_requests;
create policy social_requests_read on public.social_fund_requests for select to authenticated using (
  public.has_group_permission(group_id, 'social_fund:read')
  or public.has_group_permission(group_id, 'social_fund:decide')
  or public.has_group_permission(group_id, 'social_fund:manage')
  or public.has_group_permission(group_id, 'financial:read')
  or exists (select 1 from public.members m where m.id = social_fund_requests.member_id and m.user_id = auth.uid())
);

create policy join_requests_self_read on public.join_requests for select to authenticated using (user_id = auth.uid() or public.has_group_permission(group_id, 'members:manage'));
create policy join_requests_self_insert on public.join_requests for insert to authenticated with check (user_id = auth.uid() and not public.is_group_member(group_id));
create policy join_requests_manage on public.join_requests for update to authenticated using (public.has_group_permission(group_id, 'members:manage')) with check (public.has_group_permission(group_id, 'members:manage'));
create policy invitations_read on public.group_invitations for select to authenticated using (public.has_group_permission(group_id, 'members:invite') or lower(email) = lower((select u.email from auth.users u where u.id = auth.uid())));
create policy invitations_manage on public.group_invitations for all to authenticated using (public.has_group_permission(group_id, 'members:invite')) with check (invited_by = auth.uid() and public.has_group_permission(group_id, 'members:invite'));

create policy chat_threads_read on public.chat_threads for select to authenticated using (exists (select 1 from public.chat_thread_members tm where tm.thread_id = chat_threads.id and tm.user_id = auth.uid()));
create policy chat_threads_create on public.chat_threads for insert to authenticated with check (created_by = auth.uid() and public.has_group_permission(group_id, 'communications:send'));
create policy chat_thread_members_read on public.chat_thread_members for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.chat_threads t where t.id = chat_thread_members.thread_id and t.kind = 'group' and public.has_group_permission(t.group_id, 'communications:read')));
create policy chat_messages_read on public.chat_messages for select to authenticated using (exists (select 1 from public.chat_thread_members tm where tm.thread_id = chat_messages.thread_id and tm.user_id = auth.uid()));
create policy chat_messages_send on public.chat_messages for insert to authenticated with check (sender_id = auth.uid() and exists (select 1 from public.chat_threads t join public.chat_thread_members tm on tm.thread_id = t.id where t.id = chat_messages.thread_id and tm.user_id = auth.uid() and public.has_group_permission(t.group_id, 'communications:send')));
create policy chat_messages_edit_self on public.chat_messages for update to authenticated using (sender_id = auth.uid() and created_at > now() - interval '15 minutes') with check (sender_id = auth.uid() and created_at > now() - interval '15 minutes');
create policy chat_messages_moderate on public.chat_messages for update to authenticated using (exists (select 1 from public.chat_threads t where t.id = chat_messages.thread_id and public.has_group_permission(t.group_id, 'messages:moderate'))) with check (exists (select 1 from public.chat_threads t where t.id = chat_messages.thread_id and public.has_group_permission(t.group_id, 'messages:moderate')));
create policy announcements_read on public.group_announcements for select to authenticated using (public.is_group_member(group_id) or public.has_group_permission(group_id, 'announcements:manage'));
create policy announcements_manage on public.group_announcements for all to authenticated using (public.has_group_permission(group_id, 'announcements:manage')) with check (created_by = auth.uid() and public.has_group_permission(group_id, 'announcements:manage'));
create policy system_controls_read on public.group_system_controls for select to authenticated using (public.is_group_member(group_id) or public.has_group_permission(group_id, 'system:configure') or public.has_group_permission(group_id, 'system:lock'));
create policy system_controls_manage on public.group_system_controls for all to authenticated using (public.has_group_permission(group_id, 'system:configure') or public.has_group_permission(group_id, 'system:lock')) with check (public.has_group_permission(group_id, 'system:configure') or public.has_group_permission(group_id, 'system:lock'));

drop policy if exists loan_repayments_add_authorized on public.loan_repayments;
drop policy if exists loan_repayments_read_authorized on public.loan_repayments;
drop policy if exists loan_repayments_verify_authorized on public.loan_repayments;
create policy loan_repayments_read_authorized on public.loan_repayments for select to authenticated using (
  public.has_group_permission(group_id, 'repayments:read')
  or public.has_group_permission(group_id, 'financial:read')
  or exists (select 1 from public.loans l join public.members m on m.id = l.member_id where l.id = loan_repayments.loan_id and m.user_id = auth.uid())
);
create policy loan_repayments_submit_authorized on public.loan_repayments for insert to authenticated with check (
  created_by = auth.uid() and received_by = auth.uid() and status = 'pending'
  and exists (select 1 from public.loans l join public.members m on m.id = l.member_id where l.id = loan_repayments.loan_id and l.group_id = loan_repayments.group_id and l.status in ('active', 'defaulted') and m.user_id = auth.uid())
);
create policy loan_repayments_record_authorized on public.loan_repayments for insert to authenticated with check (
  created_by = auth.uid() and received_by = auth.uid() and status = 'verified'
  and public.has_group_permission(group_id, 'repayments:record')
  and exists (select 1 from public.loans l where l.id = loan_repayments.loan_id and l.group_id = loan_repayments.group_id and l.status in ('active', 'defaulted'))
);
create policy loan_repayments_verify_authorized on public.loan_repayments for update to authenticated
using (public.has_group_permission(group_id, 'repayments:verify'))
with check (public.has_group_permission(group_id, 'repayments:verify') and verified_by = auth.uid());

drop policy if exists audit_logs_read_authorized on public.audit_logs;
create policy audit_logs_read_authorized on public.audit_logs for select to authenticated using (
  group_id is not null and (
    (entity in ('contributions', 'loans', 'loan_repayments', 'savings_adjustments', 'share_transactions', 'bank_transactions', 'social_fund_requests', 'expenses', 'loan_interest_charges', 'financial_period_closings', 'financial_correction_requests', 'profit_calculations') and public.has_group_permission(group_id, 'financial_audit:read'))
    or (entity in ('groups', 'group_cycles', 'cycle_members', 'group_system_controls') and (public.has_group_permission(group_id, 'groups:manage') or public.has_group_permission(group_id, 'audit:read')))
    or (entity = 'members' and public.has_group_permission(group_id, 'members:read'))
    or (entity in ('meetings', 'attendance', 'meeting_decisions', 'meeting_votes', 'meeting_documents') and public.has_group_permission(group_id, 'meetings:read'))
    or (entity in ('group_role_assignments', 'chairperson_role', 'join_requests', 'group_invitations', 'group_announcements') and (public.has_group_permission(group_id, 'roles:read') or public.has_group_permission(group_id, 'roles:manage') or public.has_group_permission(group_id, 'audit:read')))
    or (entity in ('chat_threads', 'chat_messages') and (public.has_group_permission(group_id, 'messages:moderate') or public.has_group_permission(group_id, 'audit:read')))
  )
);

create or replace function public.write_operational_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare before_row jsonb; after_row jsonb; row_data jsonb; roles text[]; permission_key text;
begin
  before_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_row := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  row_data := coalesce(after_row, before_row);
  roles := public.current_group_roles((row_data ->> 'group_id')::uuid);
  if public.is_group_member((row_data ->> 'group_id')::uuid) then roles := array_append(roles, 'member'); end if;
  permission_key := case
    when tg_table_name in ('group_cycles', 'cycle_members') then 'cycles:manage'
    when tg_table_name = 'contribution_obligations' then 'obligations:manage'
    when tg_table_name = 'share_transactions' then 'shares:manage'
    when tg_table_name = 'bank_transactions' then 'reconciliation:manage'
    when tg_table_name = 'social_fund_requests' then 'social_fund:decide'
    when tg_table_name = 'expenses' then 'expenses:manage'
    when tg_table_name = 'loan_interest_charges' then 'interest:calculate'
    when tg_table_name in ('financial_period_closings', 'financial_correction_requests') then 'closing:manage'
    when tg_table_name = 'profit_calculations' then 'profit:calculate'
    when tg_table_name = 'group_announcements' then 'announcements:manage'
    when tg_table_name = 'group_system_controls' then 'system:configure'
    else null end;
  insert into public.audit_logs(group_id, actor_id, action, entity, entity_id, permission_used, authority_roles, before_data, after_data)
  values ((row_data ->> 'group_id')::uuid, auth.uid(), lower(tg_op), tg_table_name, row_data ->> 'id', permission_key, roles, before_row, after_row);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger group_cycles_audit after insert or update or delete on public.group_cycles for each row execute function public.write_operational_audit();
create trigger cycle_members_audit after insert or update or delete on public.cycle_members for each row execute function public.write_operational_audit();
create trigger obligations_audit after insert or update or delete on public.contribution_obligations for each row execute function public.write_operational_audit();
create trigger shares_audit after insert or update or delete on public.share_transactions for each row execute function public.write_operational_audit();
create trigger bank_transactions_audit after insert or update or delete on public.bank_transactions for each row execute function public.write_operational_audit();
create trigger social_requests_audit after insert or update or delete on public.social_fund_requests for each row execute function public.write_operational_audit();
create trigger expenses_audit after insert or update or delete on public.expenses for each row execute function public.write_operational_audit();
create trigger interest_audit after insert or update or delete on public.loan_interest_charges for each row execute function public.write_operational_audit();
create trigger closings_audit after insert or update or delete on public.financial_period_closings for each row execute function public.write_operational_audit();
create trigger corrections_audit after insert or update or delete on public.financial_correction_requests for each row execute function public.write_operational_audit();
create trigger profits_audit after insert or update or delete on public.profit_calculations for each row execute function public.write_operational_audit();
create trigger announcements_audit after insert or update or delete on public.group_announcements for each row execute function public.write_operational_audit();
create trigger system_controls_audit after insert or update or delete on public.group_system_controls for each row execute function public.write_operational_audit();

create or replace function public.guard_closed_financial_period()
returns trigger language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; target_group uuid; target_period date;
begin
  if tg_op <> 'INSERT' then
    row_data := to_jsonb(old);
    target_group := (row_data ->> 'group_id')::uuid;
    target_period := case
      when tg_table_name = 'contributions' or tg_table_name = 'loan_interest_charges' then date_trunc('month', (row_data ->> 'period')::date)::date
      when tg_table_name = 'expenses' then date_trunc('month', (row_data ->> 'spent_on')::date)::date
      when tg_table_name = 'loan_repayments' then date_trunc('month', (row_data ->> 'received_at')::timestamptz)::date
      when tg_table_name = 'bank_transactions' then date_trunc('month', (row_data ->> 'transaction_date')::timestamptz)::date
      else date_trunc('month', (row_data ->> 'created_at')::timestamptz)::date end;
    perform pg_advisory_xact_lock(hashtextextended(target_group::text, 0));
    if exists (select 1 from public.financial_period_closings f where f.group_id = target_group and f.period = target_period and f.status = 'closed') then
      raise exception 'This financial month is closed; submit a controlled correction request';
    end if;
  end if;
  if tg_op <> 'DELETE' then
    row_data := to_jsonb(new);
    target_group := (row_data ->> 'group_id')::uuid;
    target_period := case
      when tg_table_name = 'contributions' or tg_table_name = 'loan_interest_charges' then date_trunc('month', (row_data ->> 'period')::date)::date
      when tg_table_name = 'expenses' then date_trunc('month', (row_data ->> 'spent_on')::date)::date
      when tg_table_name = 'loan_repayments' then date_trunc('month', (row_data ->> 'received_at')::timestamptz)::date
      when tg_table_name = 'bank_transactions' then date_trunc('month', (row_data ->> 'transaction_date')::timestamptz)::date
      else date_trunc('month', (row_data ->> 'created_at')::timestamptz)::date end;
    perform pg_advisory_xact_lock(hashtextextended(target_group::text, 0));
    if exists (select 1 from public.financial_period_closings f where f.group_id = target_group and f.period = target_period and f.status = 'closed') then
      raise exception 'This financial month is closed; submit a controlled correction request';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger contribution_closed_period_guard before insert or update or delete on public.contributions for each row execute function public.guard_closed_financial_period();
create trigger expense_closed_period_guard before insert or update or delete on public.expenses for each row execute function public.guard_closed_financial_period();
create trigger share_closed_period_guard before insert or update or delete on public.share_transactions for each row execute function public.guard_closed_financial_period();
create trigger bank_closed_period_guard before insert or update or delete on public.bank_transactions for each row execute function public.guard_closed_financial_period();
create trigger interest_closed_period_guard before insert or update or delete on public.loan_interest_charges for each row execute function public.guard_closed_financial_period();

-- Add narrow SQL grants for the new operational tables and expanded repayment flow.
revoke all on public.group_cycles, public.cycle_members, public.contribution_obligations, public.share_transactions,
  public.bank_transactions, public.social_fund_requests, public.expenses, public.loan_interest_charges,
  public.financial_period_closings, public.financial_correction_requests, public.profit_calculations,
  public.meeting_decisions, public.meeting_votes, public.meeting_documents, public.join_requests,
  public.group_invitations, public.chat_threads, public.chat_thread_members, public.chat_messages,
  public.group_announcements, public.group_system_controls from anon, authenticated;
grant select on public.group_cycles, public.cycle_members, public.contribution_obligations, public.share_transactions,
  public.bank_transactions, public.social_fund_requests, public.expenses, public.loan_interest_charges,
  public.financial_period_closings, public.financial_correction_requests, public.profit_calculations,
  public.meeting_decisions, public.meeting_votes, public.meeting_documents, public.join_requests,
  public.group_invitations, public.chat_threads, public.chat_thread_members, public.chat_messages,
  public.group_announcements, public.group_system_controls to authenticated;
grant insert (group_id, cycle_id, member_id, direction, units, unit_price, reference, created_by) on public.share_transactions to authenticated;
grant update (status, verified_by, verified_at) on public.share_transactions to authenticated;
grant insert (group_id, account_label, transaction_date, description, amount, reference, imported_by) on public.bank_transactions to authenticated;
grant update (matched_entity, matched_entity_id, status, reconciled_by, reconciled_at) on public.bank_transactions to authenticated;
grant insert (group_id, member_id, amount_requested, reason, requested_by) on public.social_fund_requests to authenticated;
grant update (status, decision_note, decided_by, decided_at, disbursed_at, disbursement_reference) on public.social_fund_requests to authenticated;
grant insert (group_id, cycle_id, category, description, funding_source, amount, spent_on, payment_method, reference, created_by) on public.expenses to authenticated;
grant update (status, approved_by, approved_at, paid_at) on public.expenses to authenticated;
grant insert (meeting_id, title, description, voting_open, voting_closes_at, created_by) on public.meeting_decisions to authenticated;
grant update (title, description, voting_closes_at) on public.meeting_decisions to authenticated;
grant insert (decision_id, member_id, vote) on public.meeting_votes to authenticated;
grant insert (meeting_id, title, storage_path, uploaded_by) on public.meeting_documents to authenticated;
grant insert (group_id, user_id, message) on public.join_requests to authenticated;
grant update (status, reviewed_by, reviewed_at) on public.join_requests to authenticated;
grant insert (group_id, email, token_hash, invited_by, expires_at) on public.group_invitations to authenticated;
grant update (status, accepted_by) on public.group_invitations to authenticated;
grant insert (group_id, kind, title, created_by) on public.chat_threads to authenticated;
grant insert (thread_id, user_id) on public.chat_thread_members to authenticated;
grant insert (thread_id, sender_id, body) on public.chat_messages to authenticated;
grant update (body, edited_at, deleted_at, moderated_by) on public.chat_messages to authenticated;
grant insert (group_id, title, body, published_at, created_by) on public.group_announcements to authenticated;
grant update (title, body, published_at) on public.group_announcements to authenticated;
grant insert (group_id) on public.group_system_controls to authenticated;
grant update (status, message, disabled_modules, changed_by, updated_at) on public.group_system_controls to authenticated;

revoke insert, update on public.loan_repayments from authenticated;
grant insert (loan_id, group_id, amount, principal_amount, interest_amount, status, created_by, received_by, payment_method, reference)
  on public.loan_repayments to authenticated;
grant update (status, verified_by, verified_at) on public.loan_repayments to authenticated;
grant update (outstanding_amount, outstanding_interest, status, due_date, rejection_reason, disbursement_reference, is_draft)
  on public.loans to authenticated;
grant execute on function public.create_group_cycle(uuid, text, date, date, numeric, numeric, smallint, numeric, numeric, jsonb) to authenticated;
grant execute on function public.set_group_cycle_status(uuid, uuid, text, date) to authenticated;
grant execute on function public.generate_monthly_obligations(uuid, uuid, date) to authenticated;
grant execute on function public.accrue_monthly_interest(uuid, date) to authenticated;
grant execute on function public.close_financial_month(uuid, date, uuid) to authenticated;
grant execute on function public.request_group_join(uuid, text) to authenticated;
grant execute on function public.create_chat_thread(uuid, text, text, uuid[]) to authenticated;
revoke all on function public.write_operational_audit() from public, anon, authenticated;
revoke all on function public.guard_closed_financial_period() from public, anon, authenticated;
revoke all on function public.apply_loan_repayment() from public, anon, authenticated;

-- Link new loans to the cycle they belong to while preserving legacy records.
alter table public.loans add column cycle_id uuid;
alter table public.loans add constraint loans_cycle_fk
  foreign key (group_id, cycle_id) references public.group_cycles(group_id, id) on delete restrict;

create or replace view public.savings_summary as
with contribution_totals as (
  select group_id,
    coalesce(sum(amount) filter (where contribution_type <> 'social'), 0) as collected,
    coalesce(sum(amount) filter (where contribution_type = 'social'), 0) as social_collected
  from public.contributions where status = 'verified' group by group_id
), loan_totals as (
  select group_id, coalesce(sum(outstanding_amount), 0) as outstanding
  from public.loans where status in ('active', 'defaulted', 'approved') group by group_id
), interest_totals as (
  select group_id, coalesce(sum(interest_amount), 0) as collected
  from public.loan_repayments where status = 'verified' group by group_id
), share_totals as (
  select group_id,
    coalesce(sum(case when direction = 'purchase' then amount else -amount end), 0) as net_cash,
    coalesce(sum(case when direction = 'purchase' then units * unit_price else -units * unit_price end), 0) as share_value
  from public.share_transactions where status = 'verified' group by group_id
), group_expense_totals as (
  select group_id, coalesce(sum(amount), 0) as paid
  from public.expenses where status = 'paid' and funding_source <> 'social_fund' group by group_id
), social_expense_totals as (
  select group_id, coalesce(sum(amount), 0) as paid
  from public.expenses where status = 'paid' and funding_source = 'social_fund' group by group_id
), social_disbursements as (
  select group_id, coalesce(sum(amount_requested), 0) as paid
  from public.social_fund_requests where status = 'disbursed' group by group_id
), adjustments as (
  select group_id, coalesce(sum(amount), 0) as adjusted
  from public.savings_adjustments group by group_id
)
select g.id as group_id, g.currency,
       coalesce(c.collected, 0)::numeric(15,0) as total_contributions,
       coalesce(l.outstanding, 0)::numeric(15,0) as total_loans_outstanding,
       g.reserve_balance + coalesce(a.adjusted, 0)::numeric(15,0) as reserve_balance,
       (coalesce(c.collected, 0) + coalesce(i.collected, 0) + coalesce(s.net_cash, 0)
        - coalesce(l.outstanding, 0) - g.reserve_balance - coalesce(a.adjusted, 0) - coalesce(e.paid, 0))::numeric(15,0) as available_balance,
       now() as as_of,
       coalesce(i.collected, 0)::numeric(15,0) as interest_collected,
       coalesce(e.paid, 0)::numeric(15,0) as group_expenses,
       (coalesce(c.social_collected, 0) - coalesce(se.paid, 0) - coalesce(sd.paid, 0))::numeric(15,0) as social_fund_balance,
       coalesce(s.share_value, 0)::numeric(15,0) as share_value
from public.groups g
left join contribution_totals c on c.group_id = g.id
left join loan_totals l on l.group_id = g.id
left join interest_totals i on i.group_id = g.id
left join share_totals s on s.group_id = g.id
left join group_expense_totals e on e.group_id = g.id
left join social_expense_totals se on se.group_id = g.id
left join social_disbursements sd on sd.group_id = g.id
left join adjustments a on a.group_id = g.id
where public.has_group_permission(g.id, 'financial:read');
grant select on public.savings_summary to authenticated;

create or replace function public.refresh_contribution_obligation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare obligation_group uuid; obligation_key uuid;
begin
  if tg_op <> 'INSERT' then
    obligation_key := old.obligation_id;
    obligation_group := old.group_id;
    if obligation_key is not null then
      update public.contribution_obligations o set status = case
        when o.status = 'waived' then 'waived'
        when paid.total >= o.amount_due + o.penalty_amount then 'paid'
        when paid.total > 0 then 'partially_paid'
        else 'due' end
      from (select coalesce(sum(c.amount), 0) as total from public.contributions c
        where c.obligation_id = obligation_key and c.group_id = obligation_group and c.status = 'verified') paid
      where o.id = obligation_key and o.group_id = obligation_group;
    end if;
  end if;
  if tg_op <> 'DELETE' then
    obligation_key := new.obligation_id;
    obligation_group := new.group_id;
    if obligation_key is not null then
      update public.contribution_obligations o set status = case
        when o.status = 'waived' then 'waived'
        when paid.total >= o.amount_due + o.penalty_amount then 'paid'
        when paid.total > 0 then 'partially_paid'
        else 'due' end
      from (select coalesce(sum(c.amount), 0) as total from public.contributions c
        where c.obligation_id = obligation_key and c.group_id = obligation_group and c.status = 'verified') paid
      where o.id = obligation_key and o.group_id = obligation_group;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger contribution_obligation_refresh after insert or update or delete on public.contributions
for each row execute function public.refresh_contribution_obligation();

create or replace function public.apply_contribution_penalties(target_group uuid, obligation_period date)
returns integer language plpgsql security definer set search_path = '' as $$
declare changed_count integer; period_start date;
begin
  if not public.has_group_permission(target_group, 'obligations:manage') then raise exception 'Contribution-obligation permission required'; end if;
  period_start := date_trunc('month', obligation_period)::date;
  update public.contribution_obligations o set penalty_amount = c.late_penalty
  from public.group_cycles c
  where o.group_id = target_group and o.cycle_id = c.id and o.period <= period_start
    and o.due_on < current_date and o.status in ('due', 'partially_paid') and c.late_penalty > o.penalty_amount;
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

create or replace function public.reconcile_bank_transaction(target_transaction uuid, target_entity text, target_entity_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare transaction_row public.bank_transactions%rowtype; ledger_amount numeric; ledger_group uuid; ledger_status text;
begin
  select * into transaction_row from public.bank_transactions where id = target_transaction for update;
  if not found then raise exception 'Bank transaction not found'; end if;
  if not public.has_group_permission(transaction_row.group_id, 'reconciliation:manage') then raise exception 'Reconciliation permission required'; end if;
  if transaction_row.status <> 'unmatched' then raise exception 'Only unmatched transactions can be reconciled'; end if;
  case target_entity
    when 'contributions' then
      select amount, group_id, status into ledger_amount, ledger_group, ledger_status from public.contributions where id = target_entity_id;
    when 'loan_repayments' then
      select amount, group_id, status into ledger_amount, ledger_group, ledger_status from public.loan_repayments where id = target_entity_id;
    when 'expenses' then
      select -amount, group_id, status into ledger_amount, ledger_group, ledger_status from public.expenses where id = target_entity_id;
    when 'share_transactions' then
      select case when direction = 'purchase' then amount else -amount end, group_id, status
        into ledger_amount, ledger_group, ledger_status from public.share_transactions where id = target_entity_id;
    else raise exception 'Unsupported reconciliation source';
  end case;
  if ledger_group is distinct from transaction_row.group_id or ledger_status not in ('verified', 'paid') then
    raise exception 'The ledger item is not verified for this group';
  end if;
  if ledger_amount <> transaction_row.amount then raise exception 'The bank amount does not match the ledger amount'; end if;
  update public.bank_transactions set matched_entity = target_entity, matched_entity_id = target_entity_id,
    status = 'reconciled', reconciled_by = auth.uid(), reconciled_at = now()
  where id = target_transaction;
  return target_transaction;
end;
$$;

create or replace function public.calculate_cycle_profit(target_group uuid, target_cycle uuid, profit_period date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare calculation_id uuid;
begin
  if not public.has_group_permission(target_group, 'profit:calculate') then raise exception 'Profit calculation permission required'; end if;
  if not exists (select 1 from public.group_cycles c where c.id = target_cycle and c.group_id = target_group) then raise exception 'Cycle not found'; end if;
  with income_total as (
    select coalesce(sum(r.interest_amount), 0)::numeric(15,0) as total
    from public.loan_repayments r join public.loans l on l.id = r.loan_id
    where l.group_id = target_group and l.cycle_id = target_cycle and r.status = 'verified'
      and (profit_period is null or date_trunc('month', r.received_at)::date = date_trunc('month', profit_period)::date)
  ), expense_total as (
    select coalesce(sum(e.amount), 0)::numeric(15,0) as total
    from public.expenses e where e.group_id = target_group and e.cycle_id = target_cycle
      and e.status = 'paid' and e.funding_source <> 'social_fund'
      and (profit_period is null or date_trunc('month', e.spent_on)::date = date_trunc('month', profit_period)::date)
  ), ownership as (
    select member_id, sum(case when direction = 'purchase' then units else -units end) as units
    from public.share_transactions where group_id = target_group and cycle_id = target_cycle and status = 'verified'
    group by member_id having sum(case when direction = 'purchase' then units else -units end) > 0
  ), total_units as (select coalesce(sum(units), 0) as units from ownership), profit as (
    select i.total as income, e.total as expenses, i.total - e.total as net from income_total i cross join expense_total e
  ), allocation_bases as (
    select o.member_id, o.units,
      floor(greatest(p.net, 0) * o.units / nullif(t.units, 0))::numeric(15,0) as base_amount,
      (greatest(p.net, 0) * o.units / nullif(t.units, 0)
        - floor(greatest(p.net, 0) * o.units / nullif(t.units, 0))) as fractional_remainder,
      greatest(p.net, 0) as distributable
    from ownership o cross join total_units t cross join profit p where t.units > 0
  ), allocation_ranked as (
    select b.*, row_number() over (order by fractional_remainder desc, member_id) as remainder_rank,
      distributable - sum(base_amount) over () as leftover_units
    from allocation_bases b
  ), member_allocations as (
    select member_id, units,
      base_amount + case when remainder_rank <= leftover_units then 1 else 0 end as amount
    from allocation_ranked
  )
  insert into public.profit_calculations(group_id, cycle_id, period, income, expenses, net_profit, allocation_formula, allocations, calculated_by)
  select target_group, target_cycle, date_trunc('month', profit_period)::date, p.income, p.expenses, p.net,
    jsonb_build_object('method', 'verified share ownership with largest-remainder rounding', 'total_units', (select units from total_units)),
    coalesce((select jsonb_agg(jsonb_build_object('member_id', member_id, 'units', units, 'amount', amount) order by member_id) from member_allocations), '[]'::jsonb),
    auth.uid()
  from profit p returning id into calculation_id;
  return calculation_id;
end;
$$;

create or replace function public.set_profit_calculation_status(target_calculation uuid, next_status text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare calculation public.profit_calculations%rowtype; distribution_total numeric; available_funds numeric;
begin
  select * into calculation from public.profit_calculations where id = target_calculation for update;
  if not found then raise exception 'Profit calculation not found'; end if;
  if next_status = 'approved' and calculation.status = 'draft'
     and public.has_group_permission(calculation.group_id, 'profit:distribute') then
    update public.profit_calculations set status = 'approved', approved_by = auth.uid() where id = target_calculation;
  elsif next_status = 'distributed' and calculation.status = 'approved'
     and public.has_group_permission(calculation.group_id, 'profit:distribute') then
    perform pg_advisory_xact_lock(hashtextextended(calculation.group_id::text, 0));
    select coalesce(sum((allocation ->> 'amount')::numeric), 0) into distribution_total
    from jsonb_array_elements(calculation.allocations) as allocation_rows(allocation)
    where (allocation ->> 'amount')::numeric > 0;
    select available_balance into available_funds from public.savings_summary where group_id = calculation.group_id;
    if coalesce(available_funds, 0) < distribution_total then raise exception 'The group does not have enough available funds for this distribution'; end if;
    insert into public.expenses(group_id, cycle_id, category, description, funding_source, amount, spent_on, payment_method, reference, status, created_by, approved_by, approved_at, paid_at)
    select calculation.group_id, calculation.cycle_id, 'profit_distribution', 'Cycle profit distribution', 'profit', (allocation ->> 'amount')::numeric,
      current_date, 'other', 'profit:' || calculation.id::text || ':' || (allocation ->> 'member_id'), 'paid', auth.uid(), auth.uid(), now(), now()
    from jsonb_array_elements(calculation.allocations) as allocation_rows(allocation)
    where (allocation ->> 'amount')::numeric > 0;
    update public.profit_calculations set status = 'distributed', distributed_at = now() where id = target_calculation;
  else raise exception 'Invalid profit distribution transition'; end if;
  return target_calculation;
end;
$$;

create or replace function public.submit_loan_draft(target_loan uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  update public.loans l set is_draft = false
  where l.id = target_loan and l.status = 'pending' and l.is_draft
    and exists (select 1 from public.members m where m.id = l.member_id and m.user_id = auth.uid() and m.status = 'active');
  if not found then raise exception 'Draft not found or no longer editable'; end if;
  return target_loan;
end;
$$;

create or replace function public.update_loan_draft(target_loan uuid, requested_principal numeric, requested_rate numeric, requested_term integer, requested_purpose text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare cycle_limit numeric;
begin
  select c.loan_limit into cycle_limit from public.loans l left join public.group_cycles c on c.id = l.cycle_id and c.group_id = l.group_id
  where l.id = target_loan and l.status = 'pending' and l.is_draft
    and exists (select 1 from public.members m where m.id = l.member_id and m.user_id = auth.uid() and m.status = 'active');
  if not found then raise exception 'Draft not found or no longer editable'; end if;
  if cycle_limit is not null and requested_principal > cycle_limit then raise exception 'Requested amount is above the cycle loan limit'; end if;
  if requested_principal <= 0 or requested_rate < 0 or requested_rate > 100 or requested_term < 1 or requested_term > 120 or char_length(btrim(requested_purpose)) < 5 then
    raise exception 'Draft values are invalid';
  end if;
  update public.loans set principal = requested_principal, outstanding_amount = requested_principal, interest_rate = requested_rate,
    term_months = requested_term, purpose = btrim(requested_purpose) where id = target_loan;
  return target_loan;
end;
$$;

create or replace function public.decide_loan(target_loan uuid, next_status text, target_due_date date default null, decision_note text default null, disbursement_ref text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare loan_group uuid; current_status text;
begin
  select group_id, status into loan_group, current_status from public.loans where id = target_loan for update;
  if loan_group is null then raise exception 'Loan not found'; end if;
  if next_status = 'approved' or next_status = 'rejected' then
    if not public.has_group_permission(loan_group, 'loans:approve') or current_status <> 'pending' then raise exception 'Loan approval permission required'; end if;
    if next_status = 'rejected' and char_length(btrim(coalesce(decision_note, ''))) < 3 then raise exception 'A rejection reason is required'; end if;
    update public.loans set status = next_status::public.loan_status, approved_by = auth.uid(), rejection_reason = case when next_status = 'rejected' then decision_note else null end
      where id = target_loan;
  elsif next_status = 'active' then
    if not public.has_group_permission(loan_group, 'loans:disburse') or current_status <> 'approved' then raise exception 'Loan disbursement permission required'; end if;
    if target_due_date is null or target_due_date <= current_date then raise exception 'A future due date is required for disbursement'; end if;
    update public.loans set status = 'active', due_date = target_due_date, disbursement_reference = nullif(btrim(disbursement_ref), ''), disbursed_at = now()
      where id = target_loan;
  else raise exception 'Unsupported loan decision'; end if;
  return target_loan;
end;
$$;

create or replace function public.cancel_approved_loan(target_loan uuid, cancellation_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  update public.loans l set status = 'rejected', rejection_reason = coalesce(nullif(btrim(cancellation_note), ''), 'Cancelled by member before disbursement')
  where l.id = target_loan and l.status = 'approved'
    and exists (select 1 from public.members m where m.id = l.member_id and m.user_id = auth.uid());
  if not found then raise exception 'Only your approved, undistributed loan can be cancelled'; end if;
  return target_loan;
end;
$$;

create or replace function public.extend_active_loan(target_loan uuid, new_due_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare loan_group uuid; previous_due date;
begin
  select group_id, due_date into loan_group, previous_due from public.loans where id = target_loan and status = 'active' for update;
  if loan_group is null then raise exception 'Active loan not found'; end if;
  if not public.has_group_permission(loan_group, 'loans:manage') then raise exception 'Loan-management permission required'; end if;
  if new_due_date <= coalesce(previous_due, current_date) then raise exception 'The extended due date must be after the current due date'; end if;
  update public.loans set due_date = new_due_date where id = target_loan;
  return target_loan;
end;
$$;

create or replace function public.guard_loan_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
declare funds numeric; member_user uuid;
begin
  if new.status is distinct from old.status then
    if old.status = 'pending' and new.status in ('approved', 'rejected') then
      if not public.has_group_permission(new.group_id, 'loans:approve') then raise exception 'Loan approval permission required'; end if;
      if new.status = 'rejected' and char_length(btrim(coalesce(new.rejection_reason, ''))) < 3 then raise exception 'A rejection reason is required'; end if;
    elsif old.status = 'approved' and new.status = 'active' then
      if not public.has_group_permission(new.group_id, 'loans:disburse') then raise exception 'Loan disbursement permission required'; end if;
    elsif old.status = 'approved' and new.status = 'rejected' then
      select m.user_id into member_user from public.members m where m.id = new.member_id;
      if member_user is distinct from auth.uid() or char_length(btrim(coalesce(new.rejection_reason, ''))) < 3 then raise exception 'Only the borrower can cancel an approved loan before disbursement'; end if;
    elsif old.status in ('active', 'defaulted') and new.status = 'repaid' and new.outstanding_amount = 0 and pg_trigger_depth() > 1 then
      null;
    else raise exception 'Invalid loan status transition'; end if;
    if old.status = 'pending' and new.status = 'approved' then
      perform pg_advisory_xact_lock(hashtextextended(new.group_id::text, 0));
      select available_balance into funds from public.savings_summary where group_id = new.group_id;
      if coalesce(funds, 0) < new.principal then raise exception 'The group does not have enough available funds'; end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.write_loan_repayment_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare group_key uuid; actor_roles text[]; permission_key text;
begin
  group_key := new.group_id;
  actor_roles := public.current_group_roles(group_key);
  if public.is_group_member(group_key) then actor_roles := array_append(actor_roles, 'member'); end if;
  permission_key := case when new.status = 'pending' then 'repayments:submit' when tg_op = 'UPDATE' then 'repayments:verify' else 'repayments:record' end;
  insert into public.audit_logs(group_id, actor_id, action, entity, entity_id, permission_used, authority_roles, before_data, after_data)
  values (group_key, auth.uid(), lower(tg_op), 'loan_repayments', new.id::text, permission_key, actor_roles,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end;
$$;
drop trigger loan_repayments_audit on public.loan_repayments;
create trigger loan_repayments_audit after insert or update on public.loan_repayments
for each row execute function public.write_loan_repayment_audit();

create or replace function public.guard_closed_financial_period()
returns trigger language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; target_group uuid; target_period date;
begin
  if tg_op <> 'INSERT' then
    row_data := to_jsonb(old);
    target_group := (row_data ->> 'group_id')::uuid;
    target_period := case
      when tg_table_name = 'contributions' or tg_table_name = 'loan_interest_charges' then date_trunc('month', (row_data ->> 'period')::date)::date
      when tg_table_name = 'expenses' then date_trunc('month', (row_data ->> 'spent_on')::date)::date
      when tg_table_name = 'loan_repayments' then date_trunc('month', (row_data ->> 'received_at')::timestamptz)::date
      when tg_table_name = 'bank_transactions' then date_trunc('month', (row_data ->> 'transaction_date')::timestamptz)::date
      else date_trunc('month', (row_data ->> 'created_at')::timestamptz)::date end;
    perform pg_advisory_xact_lock(hashtextextended(target_group::text, 0));
    if exists (select 1 from public.financial_period_closings f where f.group_id = target_group and f.period = target_period and f.status = 'closed') then
      raise exception 'This financial month is closed; submit a controlled correction request';
    end if;
  end if;
  if tg_op <> 'DELETE' then
    row_data := to_jsonb(new);
    target_group := (row_data ->> 'group_id')::uuid;
    target_period := case
      when tg_table_name = 'contributions' or tg_table_name = 'loan_interest_charges' then date_trunc('month', (row_data ->> 'period')::date)::date
      when tg_table_name = 'expenses' then date_trunc('month', (row_data ->> 'spent_on')::date)::date
      when tg_table_name = 'loan_repayments' then date_trunc('month', (row_data ->> 'received_at')::timestamptz)::date
      when tg_table_name = 'bank_transactions' then date_trunc('month', (row_data ->> 'transaction_date')::timestamptz)::date
      else date_trunc('month', (row_data ->> 'created_at')::timestamptz)::date end;
    perform pg_advisory_xact_lock(hashtextextended(target_group::text, 0));
    if exists (select 1 from public.financial_period_closings f where f.group_id = target_group and f.period = target_period and f.status = 'closed') then
      raise exception 'This financial month is closed; submit a controlled correction request';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger repayment_closed_period_guard before insert or update or delete on public.loan_repayments
for each row execute function public.guard_closed_financial_period();

-- A month cannot be finalized while a bank entry for that month is unmatched.
create or replace function public.close_financial_month(target_group uuid, closing_period date, target_cycle uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare close_id uuid; period_start date; report_snapshot jsonb;
begin
  if not public.has_group_permission(target_group, 'closing:manage') then raise exception 'Financial closing permission required'; end if;
  period_start := date_trunc('month', closing_period)::date;
  perform pg_advisory_xact_lock(hashtextextended(target_group::text, 0));
  if exists (select 1 from public.financial_period_closings f where f.group_id = target_group and f.period = period_start and f.status = 'closed') then
    raise exception 'This month is already closed; request a controlled correction if a record must change';
  end if;
  if exists (select 1 from public.bank_transactions b where b.group_id = target_group and date_trunc('month', b.transaction_date)::date = period_start and b.status = 'unmatched') then
    raise exception 'Every bank transaction for the month must be reconciled or explicitly ignored before closing';
  end if;
  if exists (select 1 from public.contributions c where c.group_id = target_group and date_trunc('month', c.period)::date = period_start and c.status = 'pending') then
    raise exception 'Pending contribution reviews must be resolved before closing the month';
  end if;
  if exists (select 1 from public.loan_repayments r where r.group_id = target_group and date_trunc('month', r.received_at)::date = period_start and r.status = 'pending') then
    raise exception 'Pending loan repayments must be resolved before closing the month';
  end if;
  if exists (select 1 from public.expenses e where e.group_id = target_group and date_trunc('month', e.spent_on)::date = period_start and e.status = 'pending') then
    raise exception 'Pending expense approvals must be resolved before closing the month';
  end if;
  if exists (select 1 from public.share_transactions s where s.group_id = target_group and date_trunc('month', s.created_at)::date = period_start and s.status = 'pending') then
    raise exception 'Pending share reviews must be resolved before closing the month';
  end if;
  select jsonb_build_object(
    'verified_contributions', coalesce((select sum(amount) from public.contributions where group_id = target_group and status = 'verified' and date_trunc('month', period)::date = period_start), 0),
    'principal_outstanding', coalesce((select sum(outstanding_amount) from public.loans where group_id = target_group and status in ('active', 'defaulted', 'approved')), 0),
    'interest_outstanding', coalesce((select sum(outstanding_interest) from public.loans where group_id = target_group and status in ('active', 'defaulted', 'approved')), 0),
    'verified_repayments', coalesce((select sum(amount) from public.loan_repayments where group_id = target_group and status = 'verified' and date_trunc('month', received_at)::date = period_start), 0),
    'interest_collected', coalesce((select sum(interest_amount) from public.loan_repayments where group_id = target_group and status = 'verified' and date_trunc('month', received_at)::date = period_start), 0),
    'paid_expenses', coalesce((select sum(amount) from public.expenses where group_id = target_group and status = 'paid' and date_trunc('month', spent_on)::date = period_start), 0),
    'net_share_activity', coalesce((select sum(case when direction = 'purchase' then amount else -amount end) from public.share_transactions where group_id = target_group and status = 'verified' and date_trunc('month', created_at)::date = period_start), 0),
    'unmatched_bank_transactions', coalesce((select count(*) from public.bank_transactions where group_id = target_group and date_trunc('month', transaction_date)::date = period_start and status = 'unmatched'), 0)
  ) into report_snapshot;
  insert into public.financial_period_closings(group_id, cycle_id, period, status, snapshot, prepared_by, approved_by, closed_at)
  values (target_group, target_cycle, period_start, 'review', report_snapshot, auth.uid(), null, null)
  on conflict (group_id, period) do update set cycle_id = excluded.cycle_id, status = 'review', snapshot = excluded.snapshot,
    prepared_by = auth.uid(), approved_by = null, prepared_at = now(), closed_at = null
  returning id into close_id;
  return close_id;
end;
$$;

create or replace function public.approve_financial_month(target_closing uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_group uuid; closing public.financial_period_closings%rowtype; period_start date; report_snapshot jsonb;
begin
  select group_id into target_group from public.financial_period_closings where id = target_closing;
  if target_group is null then raise exception 'Financial review not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_group::text, 0));
  select * into closing from public.financial_period_closings where id = target_closing for update;
  if closing.status <> 'review' then raise exception 'Only a prepared month can be approved'; end if;
  if not public.has_group_permission(target_group, 'closing:manage') then raise exception 'Financial closing permission required'; end if;
  if closing.prepared_by = auth.uid() then raise exception 'A different authorized person must approve the month close'; end if;
  period_start := closing.period;
  if exists (select 1 from public.bank_transactions b where b.group_id = target_group and date_trunc('month', b.transaction_date)::date = period_start and b.status = 'unmatched')
     or exists (select 1 from public.contributions c where c.group_id = target_group and date_trunc('month', c.period)::date = period_start and c.status = 'pending')
     or exists (select 1 from public.loan_repayments r where r.group_id = target_group and date_trunc('month', r.received_at)::date = period_start and r.status = 'pending')
     or exists (select 1 from public.expenses e where e.group_id = target_group and date_trunc('month', e.spent_on)::date = period_start and e.status = 'pending')
     or exists (select 1 from public.share_transactions s where s.group_id = target_group and date_trunc('month', s.created_at)::date = period_start and s.status = 'pending') then
    raise exception 'Unresolved financial records remain; review and resolve them before approval';
  end if;
  select jsonb_build_object(
    'verified_contributions', coalesce((select sum(amount) from public.contributions where group_id = target_group and status = 'verified' and date_trunc('month', period)::date = period_start), 0),
    'principal_outstanding', coalesce((select sum(outstanding_amount) from public.loans where group_id = target_group and status in ('active', 'defaulted', 'approved')), 0),
    'interest_outstanding', coalesce((select sum(outstanding_interest) from public.loans where group_id = target_group and status in ('active', 'defaulted', 'approved')), 0),
    'verified_repayments', coalesce((select sum(amount) from public.loan_repayments where group_id = target_group and status = 'verified' and date_trunc('month', received_at)::date = period_start), 0),
    'interest_collected', coalesce((select sum(interest_amount) from public.loan_repayments where group_id = target_group and status = 'verified' and date_trunc('month', received_at)::date = period_start), 0),
    'paid_expenses', coalesce((select sum(amount) from public.expenses where group_id = target_group and status = 'paid' and date_trunc('month', spent_on)::date = period_start), 0),
    'net_share_activity', coalesce((select sum(case when direction = 'purchase' then amount else -amount end) from public.share_transactions where group_id = target_group and status = 'verified' and date_trunc('month', created_at)::date = period_start), 0),
    'unmatched_bank_transactions', coalesce((select count(*) from public.bank_transactions where group_id = target_group and date_trunc('month', transaction_date)::date = period_start and status = 'unmatched'), 0)
  ) into report_snapshot;
  update public.financial_period_closings set status = 'closed', snapshot = report_snapshot, approved_by = auth.uid(), closed_at = now()
  where id = target_closing;
  return target_closing;
end;
$$;

-- Protect share ownership and approval state in the database, including direct API writes.
create or replace function public.guard_share_transaction()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owned_units numeric;
begin
  if new.status = 'verified' and (tg_op = 'INSERT' or old.status is distinct from 'verified') and new.direction = 'sale' then
    select coalesce(sum(case when direction = 'purchase' then units else -units end), 0) into owned_units
      from public.share_transactions where group_id = new.group_id and cycle_id = new.cycle_id and member_id = new.member_id and status = 'verified' and id <> new.id;
    if owned_units < new.units then raise exception 'A member cannot sell more shares than they currently own'; end if;
  end if;
  if tg_op = 'UPDATE' and old.status <> new.status and new.status = 'verified' and not public.has_group_permission(new.group_id, 'shares:manage') then
    raise exception 'Share verification permission required';
  end if;
  return new;
end;
$$;
create trigger share_transaction_guard before insert or update on public.share_transactions
for each row execute function public.guard_share_transaction();

create or replace function public.guard_expense_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
declare social_funds numeric;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if old.status = 'pending' and new.status in ('approved', 'rejected') then
      if not public.has_group_permission(new.group_id, 'expenses:approve') then raise exception 'Expense approval permission required'; end if;
    elsif old.status = 'approved' and new.status = 'paid' then
      if not public.has_group_permission(new.group_id, 'expenses:manage') then raise exception 'Expense payment permission required'; end if;
    else raise exception 'Invalid expense status transition'; end if;
    if new.status = 'paid' and new.funding_source <> 'social_fund' then
      perform pg_advisory_xact_lock(hashtextextended(new.group_id::text, 0));
      if coalesce((select available_balance from public.savings_summary where group_id = new.group_id), 0) < new.amount then
        raise exception 'The group does not have enough available funds for this expense';
      end if;
    elsif new.status = 'paid' and new.funding_source = 'social_fund' then
      perform pg_advisory_xact_lock(hashtextextended(new.group_id::text, 0));
      select coalesce(sum(c.amount) filter (where c.status = 'verified' and c.contribution_type = 'social'), 0)
        - coalesce((select sum(e.amount) from public.expenses e where e.group_id = new.group_id and e.status = 'paid' and e.funding_source = 'social_fund'), 0)
        - coalesce((select sum(r.amount_requested) from public.social_fund_requests r where r.group_id = new.group_id and r.status = 'disbursed'), 0)
        into social_funds from public.contributions c where c.group_id = new.group_id;
      if coalesce(social_funds, 0) < new.amount then raise exception 'The social fund does not have enough available funds for this expense'; end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger expense_state_guard before update of status on public.expenses
for each row execute function public.guard_expense_transition();

create or replace function public.guard_social_fund_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare available_social_funds numeric;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if old.status = 'pending' and new.status in ('approved', 'rejected') then
      if not public.has_group_permission(new.group_id, 'social_fund:decide') and not public.has_group_permission(new.group_id, 'social_fund:manage') then
        raise exception 'Social-fund decision permission required';
      end if;
      if new.decided_by is distinct from auth.uid() then raise exception 'The decision must be recorded by the current user'; end if;
      if new.status = 'rejected' and char_length(btrim(coalesce(new.decision_note, ''))) < 3 then raise exception 'A reason is required when declining a social-fund request'; end if;
    elsif old.status = 'approved' and new.status = 'disbursed' then
      if not public.has_group_permission(new.group_id, 'social_fund:manage') then raise exception 'Social-fund disbursement permission required'; end if;
      if new.decided_by is distinct from auth.uid() or new.disbursed_at is null then raise exception 'Disbursement details are required'; end if;
      perform pg_advisory_xact_lock(hashtextextended(new.group_id::text, 0));
      select coalesce(sum(c.amount) filter (where c.status = 'verified' and c.contribution_type = 'social'), 0)
        - coalesce((select sum(e.amount) from public.expenses e where e.group_id = new.group_id and e.status = 'paid' and e.funding_source = 'social_fund'), 0)
        - coalesce((select sum(r.amount_requested) from public.social_fund_requests r where r.group_id = new.group_id and r.status = 'disbursed'), 0)
        into available_social_funds from public.contributions c where c.group_id = new.group_id;
      if coalesce(available_social_funds, 0) < new.amount_requested then raise exception 'The social fund does not have enough available funds for this request'; end if;
    else
      raise exception 'Invalid social-fund request status transition';
    end if;
  end if;
  return new;
end;
$$;
create trigger social_fund_request_guard before update of status on public.social_fund_requests
for each row execute function public.guard_social_fund_request();

drop policy if exists loans_draft_owner_update on public.loans;
create policy loans_draft_owner_update on public.loans for update to authenticated
using (is_draft and status = 'pending' and exists (select 1 from public.members m where m.id = loans.member_id and m.user_id = auth.uid()))
with check (is_draft and status = 'pending' and exists (select 1 from public.members m where m.id = loans.member_id and m.user_id = auth.uid()));

-- Narrow write grants retain RLS as the authority boundary for all app routes.
grant insert (cycle_id, obligation_id, payment_method) on public.contributions to authenticated;
grant update (minutes) on public.meetings to authenticated;
grant insert (group_id, cycle_id, is_draft) on public.loans to authenticated;
grant update (principal, interest_rate, term_months, purpose) on public.loans to authenticated;
revoke update (status, approved_by, due_date, outstanding_amount, outstanding_interest, rejection_reason, disbursement_reference, is_draft) on public.loans from authenticated;
grant insert (group_id, principal_amount, interest_amount, status, created_by, payment_method) on public.loan_repayments to authenticated;
grant update (amount, principal_amount, interest_amount) on public.loan_repayments to authenticated;
revoke insert (loan_id, amount, received_by, reference) on public.loan_repayments from authenticated;
grant insert (loan_id, group_id, amount, principal_amount, interest_amount, status, created_by, received_by, payment_method, reference) on public.loan_repayments to authenticated;
grant insert (group_id, closing_id, entity, entity_id, reason, proposed_values, requested_by) on public.financial_correction_requests to authenticated;
grant update (status, decided_by, decision_note, decided_at) on public.financial_correction_requests to authenticated;
grant update (minutes) on public.meetings to authenticated;
grant execute on function public.apply_contribution_penalties(uuid, date) to authenticated;
grant execute on function public.reconcile_bank_transaction(uuid, text, uuid) to authenticated;
grant execute on function public.calculate_cycle_profit(uuid, uuid, date) to authenticated;
grant execute on function public.set_profit_calculation_status(uuid, text) to authenticated;
grant execute on function public.submit_loan_draft(uuid) to authenticated;
grant execute on function public.update_loan_draft(uuid, numeric, numeric, integer, text) to authenticated;
grant execute on function public.decide_loan(uuid, text, date, text, text) to authenticated;
grant execute on function public.cancel_approved_loan(uuid, text) to authenticated;
grant execute on function public.extend_active_loan(uuid, date) to authenticated;
revoke all on function public.refresh_contribution_obligation() from public, anon, authenticated;
revoke all on function public.guard_share_transaction() from public, anon, authenticated;
revoke all on function public.guard_expense_transition() from public, anon, authenticated;
revoke all on function public.guard_social_fund_request() from public, anon, authenticated;

create or replace function public.notify_group_members(target_group uuid, notification_title text, notification_body text, notification_href text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(user_id, title, body, href)
  select distinct m.user_id, notification_title, notification_body, notification_href
  from public.members m where m.group_id = target_group and m.status = 'active' and m.user_id is not null;
$$;

create or replace function public.notify_security_sign_in()
returns uuid language plpgsql security definer set search_path = '' as $$
declare notification_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.notifications(user_id, title, body, href)
  values (auth.uid(), 'New sign-in', 'Your Ikimina Management System account signed in successfully.', '/dashboard/settings/security')
  returning id into notification_id;
  return notification_id;
end;
$$;

create or replace function public.notify_operational_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare group_key uuid; recipient uuid; notification_title text; notification_body text; notification_href text; state text;
begin
  if tg_table_name = 'contributions' then
    if tg_op = 'UPDATE' and old.status is not distinct from new.status then return new; end if;
    group_key := new.group_id;
    select user_id into recipient from public.members where id = new.member_id;
    state := new.status;
    notification_title := case state when 'verified' then 'Contribution verified' when 'rejected' then 'Contribution needs attention' else 'Contribution received' end;
    notification_body := case state when 'verified' then 'Your contribution has been verified.' when 'rejected' then 'Your contribution was not verified. Contact the treasurer for details.' else 'Your contribution is awaiting verification.' end;
    notification_href := '/dashboard/contributions';
    if recipient is not null then insert into public.notifications(user_id, title, body, href) values (recipient, notification_title, notification_body, notification_href); end if;
  elsif tg_table_name = 'loans' then
    group_key := new.group_id;
    if tg_op = 'INSERT' then
      if new.is_draft then return new; end if;
      state := 'pending';
      notification_title := 'Loan request submitted';
      notification_body := 'Your loan request was sent for committee review.';
    else
      if old.status is not distinct from new.status then return new; end if;
      state := new.status::text;
      notification_title := case state when 'approved' then 'Loan approved' when 'rejected' then 'Loan request declined' when 'active' then 'Loan disbursed' when 'repaid' then 'Loan fully repaid' when 'defaulted' then 'Loan overdue' else 'Loan updated' end;
      notification_body := case state when 'approved' then 'Your loan request was approved. The treasurer will record disbursement.' when 'rejected' then 'Your loan request was declined.' when 'active' then 'Your loan has been disbursed. Review the due date and repayment schedule.' when 'repaid' then 'Your loan balance is fully paid.' when 'defaulted' then 'Your loan is overdue. Contact the treasurer.' else 'Your loan status changed.' end;
    end if;
    select user_id into recipient from public.members where id = new.member_id;
    if recipient is not null then insert into public.notifications(user_id, title, body, href) values (recipient, notification_title, notification_body, '/dashboard/loans'); end if;
  elsif tg_table_name = 'loan_repayments' then
    if tg_op = 'INSERT' or old.status is not distinct from new.status then return new; end if;
    select m.user_id into recipient from public.loans l join public.members m on m.id = l.member_id where l.id = new.loan_id;
    if recipient is not null then
      insert into public.notifications(user_id, title, body, href)
      values (recipient, case new.status when 'verified' then 'Repayment verified' else 'Repayment needs attention' end,
        case new.status when 'verified' then 'Your loan repayment was recorded.' else 'Your repayment was not verified. Contact the treasurer.' end, '/dashboard/loans');
    end if;
  elsif tg_table_name = 'social_fund_requests' then
    if tg_op = 'INSERT' or old.status is not distinct from new.status then return new; end if;
    select user_id into recipient from public.members where id = new.member_id;
    if recipient is not null then
      insert into public.notifications(user_id, title, body, href)
      values (recipient, case new.status when 'approved' then 'Assistance request approved' when 'rejected' then 'Assistance request declined' when 'disbursed' then 'Social fund disbursed' else 'Assistance request updated' end,
        'Your social fund request status changed to ' || new.status || '.', '/dashboard/operations');
    end if;
  elsif tg_table_name = 'expenses' then
    if tg_op = 'INSERT' or old.status is not distinct from new.status then return new; end if;
    recipient := new.created_by;
    if recipient is not null then
      insert into public.notifications(user_id, title, body, href)
      values (recipient, 'Expense ' || new.status, 'The expense “' || new.description || '” is now ' || new.status || '.', '/dashboard/operations');
    end if;
  elsif tg_table_name = 'meetings' then
    if tg_op <> 'INSERT' then return new; end if;
    perform public.notify_group_members(new.group_id, 'New group meeting', new.title || ' · ' || to_char(new.starts_at, 'FMDD Mon YYYY HH24:MI'), '/dashboard/meetings');
  elsif tg_table_name = 'meeting_decisions' then
    select group_id into group_key from public.meetings where id = new.meeting_id;
    if tg_op = 'INSERT' then
      perform public.notify_group_members(group_key, 'Meeting vote opened', new.title, '/dashboard/meetings/' || new.meeting_id::text);
    elsif old.outcome is distinct from new.outcome and new.outcome is not null then
      perform public.notify_group_members(group_key, 'Meeting decision finalized', new.title || ' · ' || new.outcome, '/dashboard/meetings/' || new.meeting_id::text);
    end if;
  elsif tg_table_name = 'group_cycles' then
    if tg_op <> 'UPDATE' or old.status is not distinct from new.status then return new; end if;
    if new.status = 'open' then perform public.notify_group_members(new.group_id, 'Savings cycle opened', new.name || ' is open for contributions.', '/dashboard/operations');
    elsif new.status in ('closing', 'closed') then perform public.notify_group_members(new.group_id, 'Savings cycle closing', new.name || ' is now ' || new.status || '.', '/dashboard/operations'); end if;
  elsif tg_table_name = 'group_announcements' then
    if new.published_at is null or (tg_op = 'UPDATE' and old.published_at is not distinct from new.published_at) then return new; end if;
    perform public.notify_group_members(new.group_id, new.title, new.body, '/dashboard/notifications');
  elsif tg_table_name = 'loan_interest_charges' then
    select m.user_id into recipient from public.loans l join public.members m on m.id = l.member_id where l.id = new.loan_id;
    if recipient is not null then
      insert into public.notifications(user_id, title, body, href)
      values (recipient, 'Loan interest due', 'Interest of ' || new.amount::text || ' is due by ' || new.due_on::text || '.', '/dashboard/loans');
    end if;
  elsif tg_table_name = 'profit_calculations' then
    if tg_op <> 'UPDATE' or old.status is not distinct from new.status or new.status <> 'distributed' then return new; end if;
    perform public.notify_group_members(new.group_id, 'Profit distribution recorded', 'The approved cycle profit distribution has been recorded.', '/dashboard/operations');
  elsif tg_table_name = 'group_system_controls' then
    if tg_op <> 'UPDATE' or old.status is not distinct from new.status then return new; end if;
    perform public.notify_group_members(new.group_id, 'Group system status changed', coalesce(new.message, 'System status: ' || new.status), '/dashboard/notifications');
  end if;
  return new;
end;
$$;

drop trigger contributions_notify on public.contributions;
drop trigger loans_notify on public.loans;
create trigger contributions_notify_operational after insert or update of status on public.contributions for each row execute function public.notify_operational_event();
create trigger loans_notify_operational after insert or update of status on public.loans for each row execute function public.notify_operational_event();
create trigger repayments_notify_operational after insert or update of status on public.loan_repayments for each row execute function public.notify_operational_event();
create trigger social_requests_notify_operational after insert or update of status on public.social_fund_requests for each row execute function public.notify_operational_event();
create trigger expenses_notify_operational after insert or update of status on public.expenses for each row execute function public.notify_operational_event();
create trigger meetings_notify_operational after insert on public.meetings for each row execute function public.notify_operational_event();
create trigger meeting_decisions_notify_operational after insert or update of outcome on public.meeting_decisions for each row execute function public.notify_operational_event();
create trigger cycles_notify_operational after update of status on public.group_cycles for each row execute function public.notify_operational_event();
create trigger announcements_notify_operational after insert or update of published_at on public.group_announcements for each row execute function public.notify_operational_event();
create trigger interest_notify_operational after insert on public.loan_interest_charges for each row execute function public.notify_operational_event();
create trigger profit_notify_operational after update of status on public.profit_calculations for each row execute function public.notify_operational_event();
create trigger system_controls_notify_operational after update of status on public.group_system_controls for each row execute function public.notify_operational_event();

create or replace function public.write_related_operational_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; before_row jsonb; after_row jsonb; group_key uuid; row_id text; roles text[]; permission_key text;
begin
  before_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_row := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  row_data := coalesce(after_row, before_row);
  if tg_table_name = 'meeting_votes' then
    select mt.group_id into group_key from public.meeting_decisions d join public.meetings mt on mt.id = d.meeting_id where d.id = (row_data ->> 'decision_id')::uuid;
  elsif tg_table_name in ('meeting_decisions', 'meeting_documents') then
    select mt.group_id into group_key from public.meetings mt where mt.id = (row_data ->> 'meeting_id')::uuid;
  elsif tg_table_name = 'chat_messages' then
    select t.group_id into group_key from public.chat_threads t where t.id = (row_data ->> 'thread_id')::uuid;
  else
    group_key := (row_data ->> 'group_id')::uuid;
  end if;
  row_id := coalesce(row_data ->> 'id', row_data ->> 'thread_id');
  roles := public.current_group_roles(group_key);
  if public.is_group_member(group_key) then roles := array_append(roles, 'member'); end if;
  permission_key := case when tg_table_name = 'meeting_votes' then 'meetings:vote' when tg_table_name = 'chat_messages' then 'communications:send' else 'meetings:manage' end;
  insert into public.audit_logs(group_id, actor_id, action, entity, entity_id, permission_used, authority_roles, before_data, after_data)
  values (group_key, auth.uid(), lower(tg_op), tg_table_name, row_id, permission_key, roles, before_row, after_row);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger meeting_decisions_audit after insert or update or delete on public.meeting_decisions for each row execute function public.write_related_operational_audit();
create trigger meeting_votes_audit after insert or update or delete on public.meeting_votes for each row execute function public.write_related_operational_audit();
create trigger meeting_documents_audit after insert or update or delete on public.meeting_documents for each row execute function public.write_related_operational_audit();
create trigger chat_threads_audit after insert or update or delete on public.chat_threads for each row execute function public.write_operational_audit();
create trigger chat_messages_audit after insert or update or delete on public.chat_messages for each row execute function public.write_related_operational_audit();
create trigger join_requests_audit after insert or update or delete on public.join_requests for each row execute function public.write_operational_audit();
create trigger invitations_audit after insert or update or delete on public.group_invitations for each row execute function public.write_operational_audit();

create or replace function public.meeting_vote_summary(target_meeting uuid)
returns table(decision_id uuid, yes_count bigint, no_count bigint, abstain_count bigint, my_vote text)
language plpgsql security definer set search_path = '' as $$
declare
  meeting_group uuid;
  can_manage boolean;
begin
  select m.group_id into meeting_group from public.meetings m where m.id = target_meeting;
  if meeting_group is null then raise exception 'Meeting not found'; end if;
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_group_member(meeting_group)
    and not public.has_group_permission(meeting_group, 'meetings:read')
    and not public.has_group_permission(meeting_group, 'meetings:manage') then
    raise exception 'Meeting access required';
  end if;
  can_manage := public.has_group_permission(meeting_group, 'meetings:manage');

  return query
  select d.id,
    case when can_manage or not d.voting_open then count(v.id) filter (where v.vote = 'yes') else 0 end,
    case when can_manage or not d.voting_open then count(v.id) filter (where v.vote = 'no') else 0 end,
    case when can_manage or not d.voting_open then count(v.id) filter (where v.vote = 'abstain') else 0 end,
    (select own_vote.vote from public.meeting_votes own_vote
      join public.members own_member on own_member.id = own_vote.member_id
      where own_vote.decision_id = d.id and own_member.user_id = auth.uid()
      limit 1)
  from public.meeting_decisions d
  left join public.meeting_votes v on v.decision_id = d.id
  where d.meeting_id = target_meeting
  group by d.id;
end;
$$;

create or replace function public.guard_meeting_vote_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meeting_group uuid;
  voting_is_open boolean;
  closes_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select m.group_id, d.voting_open, d.voting_closes_at
    into meeting_group, voting_is_open, closes_at
  from public.meeting_decisions d
  join public.meetings m on m.id = d.meeting_id
  where d.id = new.decision_id
  for update of d;
  if not found then raise exception 'Meeting decision not found'; end if;
  if not voting_is_open or (closes_at is not null and closes_at <= now()) then raise exception 'Voting is closed'; end if;
  if not exists (select 1 from public.members member_row where member_row.id = new.member_id
    and member_row.group_id = meeting_group and member_row.user_id = auth.uid() and member_row.status = 'active') then
    raise exception 'An active member of this group must cast the vote';
  end if;
  return new;
end;
$$;
create trigger meeting_votes_guard before insert on public.meeting_votes
for each row execute function public.guard_meeting_vote_insert();

create or replace function public.finalize_meeting_vote(target_decision uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  decision_row public.meeting_decisions%rowtype;
  meeting_group uuid;
  yes_votes bigint;
  no_votes bigint;
  next_outcome text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select d.* into decision_row from public.meeting_decisions d where d.id = target_decision for update;
  if not found then raise exception 'Meeting decision not found'; end if;
  select m.group_id into meeting_group from public.meetings m where m.id = decision_row.meeting_id;
  if not public.has_group_permission(meeting_group, 'meetings:manage') then raise exception 'Meeting management permission required'; end if;
  if decision_row.outcome is not null then raise exception 'This ballot has already been finalized'; end if;
  if not decision_row.voting_open then raise exception 'This decision does not have an open ballot'; end if;

  select count(*) filter (where vote = 'yes'), count(*) filter (where vote = 'no')
    into yes_votes, no_votes from public.meeting_votes where decision_id = target_decision;
  next_outcome := case when yes_votes > no_votes then 'approved' when no_votes > yes_votes then 'rejected' else 'deferred' end;
  update public.meeting_decisions set voting_open = false, outcome = next_outcome where id = target_decision;
  return target_decision;
end;
$$;

revoke all on function public.notify_group_members(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.notify_security_sign_in() from public, anon;
revoke all on function public.sync_open_cycle_membership() from public, anon, authenticated;
revoke all on function public.apply_loan_repayment() from public, anon, authenticated;
revoke all on function public.guard_loan_repayment_status() from public, anon, authenticated;
revoke all on function public.write_loan_repayment_audit() from public, anon, authenticated;
revoke all on function public.guard_share_transaction() from public, anon, authenticated;
revoke all on function public.guard_expense_transition() from public, anon, authenticated;
revoke all on function public.guard_social_fund_request() from public, anon, authenticated;
revoke all on function public.guard_closed_financial_period() from public, anon, authenticated;
revoke all on function public.guard_loan_transition() from public, anon, authenticated;
revoke all on function public.refresh_contribution_obligation() from public, anon, authenticated;
revoke all on function public.write_operational_audit() from public, anon, authenticated;
revoke all on function public.write_related_operational_audit() from public, anon, authenticated;
revoke all on function public.notify_operational_event() from public, anon, authenticated;
revoke all on function public.create_group_cycle(uuid, text, date, date, numeric, numeric, smallint, numeric, numeric, jsonb) from public, anon;
revoke all on function public.set_group_cycle_status(uuid, uuid, text, date) from public, anon;
revoke all on function public.generate_monthly_obligations(uuid, uuid, date) from public, anon;
revoke all on function public.apply_contribution_penalties(uuid, date) from public, anon;
revoke all on function public.accrue_monthly_interest(uuid, date) from public, anon;
revoke all on function public.close_financial_month(uuid, date, uuid) from public, anon;
revoke all on function public.approve_financial_month(uuid) from public, anon;
revoke all on function public.reconcile_bank_transaction(uuid, text, uuid) from public, anon;
revoke all on function public.calculate_cycle_profit(uuid, uuid, date) from public, anon;
revoke all on function public.set_profit_calculation_status(uuid, text) from public, anon;
revoke all on function public.submit_loan_draft(uuid) from public, anon;
revoke all on function public.update_loan_draft(uuid, numeric, numeric, integer, text) from public, anon;
revoke all on function public.decide_loan(uuid, text, date, text, text) from public, anon;
revoke all on function public.cancel_approved_loan(uuid, text) from public, anon;
revoke all on function public.extend_active_loan(uuid, date) from public, anon;
revoke all on function public.request_group_join(uuid, text) from public, anon;
revoke all on function public.create_chat_thread(uuid, text, text, uuid[]) from public, anon;
revoke all on function public.meeting_vote_summary(uuid) from public, anon;
revoke all on function public.guard_meeting_vote_insert() from public, anon, authenticated;
revoke all on function public.finalize_meeting_vote(uuid) from public, anon;
grant execute on function public.create_group_cycle(uuid, text, date, date, numeric, numeric, smallint, numeric, numeric, jsonb) to authenticated;
grant execute on function public.set_group_cycle_status(uuid, uuid, text, date) to authenticated;
grant execute on function public.generate_monthly_obligations(uuid, uuid, date) to authenticated;
grant execute on function public.apply_contribution_penalties(uuid, date) to authenticated;
grant execute on function public.accrue_monthly_interest(uuid, date) to authenticated;
grant execute on function public.close_financial_month(uuid, date, uuid) to authenticated;
grant execute on function public.approve_financial_month(uuid) to authenticated;
grant execute on function public.reconcile_bank_transaction(uuid, text, uuid) to authenticated;
grant execute on function public.calculate_cycle_profit(uuid, uuid, date) to authenticated;
grant execute on function public.set_profit_calculation_status(uuid, text) to authenticated;
grant execute on function public.submit_loan_draft(uuid) to authenticated;
grant execute on function public.update_loan_draft(uuid, numeric, numeric, integer, text) to authenticated;
grant execute on function public.decide_loan(uuid, text, date, text, text) to authenticated;
grant execute on function public.cancel_approved_loan(uuid, text) to authenticated;
grant execute on function public.extend_active_loan(uuid, date) to authenticated;
grant execute on function public.meeting_vote_summary(uuid) to authenticated;
grant execute on function public.finalize_meeting_vote(uuid) to authenticated;
grant execute on function public.request_group_join(uuid, text) to authenticated;
grant execute on function public.create_chat_thread(uuid, text, text, uuid[]) to authenticated;
grant execute on function public.notify_security_sign_in() to authenticated;
