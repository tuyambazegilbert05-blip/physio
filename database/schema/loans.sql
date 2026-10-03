create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  principal numeric(15,0) not null check (principal > 0), outstanding_amount numeric(15,0) not null check (outstanding_amount >= 0),
  interest_rate numeric(5,2) not null default 0 check (interest_rate between 0 and 100), term_months smallint not null check (term_months between 1 and 120),
  purpose text not null check (char_length(purpose) between 5 and 1000), status public.loan_status not null default 'pending',
  approved_by uuid references public.profiles(id) on delete set null, due_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint loan_member_group_fk foreign key (group_id, member_id) references public.members(group_id, id)
);
create table if not exists public.loan_repayments (
  id uuid primary key default gen_random_uuid(), loan_id uuid not null references public.loans(id) on delete restrict,
  amount numeric(15,0) not null check (amount > 0), received_by uuid not null references public.profiles(id) on delete restrict,
  received_at timestamptz not null default now(), reference text
);
comment on table public.loans is 'Member loan applications, decisions, and outstanding balances.';
