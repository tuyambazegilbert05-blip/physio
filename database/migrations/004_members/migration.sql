create table public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text,
  phone text,
  role public.group_role not null default 'member',
  status public.member_status not null default 'active',
  joined_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id),
  unique (group_id, email),
  unique (group_id, id)
);
create index members_group_status_idx on public.members(group_id, status);
create trigger members_set_updated_at before update on public.members
for each row execute function public.set_updated_at();

create or replace function public.create_group(group_name text, contribution numeric, frequency text, currency_code text default 'RWF')
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_group_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.groups (name, contribution_amount, contribution_frequency, currency, created_by)
  values (group_name, contribution, frequency, upper(currency_code), auth.uid())
  returning id into new_group_id;
  insert into public.members (group_id, user_id, full_name, email, role)
  select new_group_id, p.id, p.full_name, u.email, 'chairperson'
  from public.profiles p join auth.users u on u.id = p.id where p.id = auth.uid();
  return new_group_id;
end;
$$;
revoke all on function public.create_group(text, numeric, text, text) from public;
grant execute on function public.create_group(text, numeric, text, text) to authenticated;
