create table public.loans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  principal numeric(15,0) not null check (principal > 0),
  outstanding_amount numeric(15,0) not null check (outstanding_amount >= 0),
  interest_rate numeric(5,2) not null default 0 check (interest_rate between 0 and 100),
  term_months smallint not null check (term_months between 1 and 120),
  purpose text not null check (char_length(purpose) between 5 and 1000),
  status public.loan_status not null default 'pending',
  approved_by uuid references public.profiles(id) on delete set null,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loan_member_group_fk foreign key (group_id, member_id) references public.members(group_id, id)
);
create index loans_group_status_idx on public.loans(group_id, status);
create trigger loans_set_updated_at before update on public.loans
for each row execute function public.set_updated_at();

create table public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete restrict,
  amount numeric(15,0) not null check (amount > 0),
  received_by uuid not null references public.profiles(id) on delete restrict,
  received_at timestamptz not null default now(),
  reference text
);

create view public.savings_summary with (security_invoker = true) as
with contribution_totals as (
  select group_id, coalesce(sum(amount), 0) as collected
  from public.contributions where status = 'verified' group by group_id
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
left join adjustments a on a.group_id = g.id;
