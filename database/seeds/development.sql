insert into public.contributions (id, group_id, member_id, amount, contribution_type, period, status, received_at, verified_by, verified_at)
select seed.contribution_id, 'd0000000-0000-4000-8000-000000000001'::uuid, seed.member_id, seed.amount, 'regular', seed.period::date, seed.status::public.contribution_status, now(),
       (select created_by from public.groups where id = 'd0000000-0000-4000-8000-000000000001'::uuid),
       case when seed.status = 'verified' then now() else null end
from (values
  ('d0000000-0000-4000-8000-000000000021'::uuid, 'd0000000-0000-4000-8000-000000000011'::uuid, 75000::numeric, '2026-09-01', 'verified'),
  ('d0000000-0000-4000-8000-000000000022'::uuid, 'd0000000-0000-4000-8000-000000000012'::uuid, 75000::numeric, '2026-09-01', 'pending'),
  ('d0000000-0000-4000-8000-000000000023'::uuid, 'd0000000-0000-4000-8000-000000000013'::uuid, 75000::numeric, '2026-10-01', 'verified')
) as seed(contribution_id, member_id, amount, period, status)
where exists (select 1 from public.groups where id = 'd0000000-0000-4000-8000-000000000001'::uuid)
  and exists (select 1 from public.members where id = seed.member_id and group_id = 'd0000000-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;
