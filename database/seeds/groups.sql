insert into public.groups (id, name, currency, contribution_amount, contribution_frequency, created_by)
select 'd0000000-0000-4000-8000-000000000001'::uuid, 'Imboni Group', 'RWF', 75000, 'monthly', p.id
from public.profiles p
where p.normalized_email = 'treasurer@phyaiocycle.local'
on conflict (id) do nothing;

insert into public.group_role_assignments (group_id, user_id, role_key, user_email, granted_by)
select g.id, g.created_by, roles.role_key, u.email, g.created_by
from public.groups g
join public.profiles u on u.id = g.created_by
cross join (values ('chairperson'), ('committee_member'), ('system_administrator'), ('treasurer')) as roles(role_key)
where g.id = 'd0000000-0000-4000-8000-000000000001'::uuid
on conflict (group_id, user_id, role_key) do nothing;
