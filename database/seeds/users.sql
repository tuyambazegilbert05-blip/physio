insert into public.profiles (id, full_name)
select u.id, coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), 'Development Treasurer')
from auth.users u
where u.email = 'treasurer@PhyaioCycle.local'
on conflict (id) do nothing;
