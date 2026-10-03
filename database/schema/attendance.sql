create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(), meeting_id uuid not null references public.meetings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade, present boolean not null default false,
  recorded_by uuid not null references public.profiles(id) on delete restrict, recorded_at timestamptz not null default now(),
  unique (meeting_id, member_id)
);
comment on table public.attendance is 'Attendance captured for each group meeting.';
