create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160), agenda text, location text,
  starts_at timestamptz not null, ends_at timestamptz, created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), check (ends_at is null or ends_at > starts_at)
);
comment on table public.meetings is 'Scheduled group meetings and agenda notes.';
