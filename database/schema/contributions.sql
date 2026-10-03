create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  amount numeric(15,0) not null check (amount > 0),
  contribution_type text not null check (contribution_type in ('regular', 'social', 'special')),
  period date not null, status public.contribution_status not null default 'pending', reference text,
  received_at timestamptz, verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz, created_at timestamptz not null default now(),
  constraint contribution_member_group_fk foreign key (group_id, member_id) references public.members(group_id, id)
);
comment on table public.contributions is 'Contribution records; only verified records count toward savings.';
