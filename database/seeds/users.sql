-- Profile-only SQL fixtures do not create credentials. Use `pnpm db:seed` to
-- create login-ready local accounts with application-owned password hashes.
insert into public.profiles (id, full_name, email, normalized_email, email_verified_at, account_status)
values ('d0000000-0000-4000-8000-000000001000'::uuid, 'Development Treasurer',
  'treasurer@PhyaioCycle.local', 'treasurer@phyaiocycle.local', now(), 'active')
on conflict (id) do nothing;
