create table if not exists public.savings_adjustments (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.groups(id) on delete cascade,
  amount numeric(15,0) not null check (amount <> 0), reason text not null check (char_length(reason) between 3 and 500),
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now()
);
comment on table public.savings_adjustments is 'Auditable, leader-entered corrections to the group reserve.';
