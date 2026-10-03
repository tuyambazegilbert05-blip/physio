create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160), body text not null check (char_length(body) between 1 and 2000),
  href text, read_at timestamptz, created_at timestamptz not null default now()
);
comment on table public.notifications is 'Private in-app notices delivered to an authenticated profile.';
