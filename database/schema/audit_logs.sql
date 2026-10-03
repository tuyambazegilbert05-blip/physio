create table if not exists public.audit_logs (
  id bigint generated always as identity primary key, group_id uuid references public.groups(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null, action text not null, entity text not null,
  entity_id text, details jsonb not null default '{}'::jsonb, permission_used text,
  authority_roles text[] not null default '{}'::text[], before_data jsonb, after_data jsonb,
  created_at timestamptz not null default now()
);
comment on table public.audit_logs is 'Append-only record of role, financial, and operational changes with actor permission context and before/after values.';
