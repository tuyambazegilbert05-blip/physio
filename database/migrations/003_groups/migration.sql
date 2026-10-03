create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  currency char(3) not null default 'RWF',
  contribution_amount numeric(15,0) not null check (contribution_amount > 0),
  contribution_frequency text not null check (contribution_frequency in ('weekly', 'monthly', 'quarterly')),
  reserve_balance numeric(15,0) not null default 0 check (reserve_balance >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger groups_set_updated_at before update on public.groups
for each row execute function public.set_updated_at();
