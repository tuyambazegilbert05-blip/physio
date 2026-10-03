create table if not exists public.members (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 120), email text, phone text,
  status public.member_status not null default 'active',
  legacy_role text not null default 'member',
  joined_at date not null default current_date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (group_id, user_id), unique (group_id, email), unique (group_id, id)
);
comment on table public.members is 'People enrolled in a group, optionally linked to an authenticated user.';
