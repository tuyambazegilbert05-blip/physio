insert into public.members (group_id, user_id, full_name, email)
select g.id, u.id, p.full_name, u.email
from public.groups g
join auth.users u on u.id = g.created_by
join public.profiles p on p.id = u.id
where g.id = 'd0000000-0000-4000-8000-000000000001'::uuid
on conflict (group_id, user_id) do nothing;

insert into public.members (id, group_id, full_name, email)
select seed.member_id, 'd0000000-0000-4000-8000-000000000001'::uuid, seed.full_name, seed.email
from (values
  ('d0000000-0000-4000-8000-000000000011'::uuid, 'Mugisha Eric', 'eric@Phyaio Cycle.local'),
  ('d0000000-0000-4000-8000-000000000012'::uuid, 'Uwase Diane', 'diane@Phyaio Cycle.local'),
  ('d0000000-0000-4000-8000-000000000013'::uuid, 'Niyonzima Claude', 'claude@Phyaio Cycle.local')
) as seed(member_id, full_name, email)
where exists (select 1 from public.groups where id = 'd0000000-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;
