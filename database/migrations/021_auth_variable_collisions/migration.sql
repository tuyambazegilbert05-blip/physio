-- Resolve PL/pgSQL variable/column name collisions that caused app OTP
-- verification and group invitation creation to fail at runtime.

create or replace function public.verify_email_verification_code(target_email text, target_code_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  challenge public.email_verification_challenges%rowtype;
  requested_email text := lower(btrim(target_email));
  now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is null or requested_email is null or char_length(requested_email) not between 3 and 254
     or target_code_hash is null or target_code_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  select c.* into challenge from public.email_verification_challenges c
  join public.profiles p on p.id = c.user_id
  where c.user_id = auth.uid() and lower(c.email) = requested_email
    and p.normalized_email = requested_email and p.account_status = 'pending_verification'
  for update of c;
  if challenge.user_id is null then return false; end if;
  if challenge.expires_at <= now_at or challenge.attempts >= 5 then
    delete from public.email_verification_challenges where user_id = challenge.user_id;
    return false;
  end if;
  if challenge.code_hash is distinct from target_code_hash then
    update public.email_verification_challenges set attempts = least(attempts + 1, 5) where user_id = challenge.user_id;
    return false;
  end if;
  update public.profiles set email_verified_at = now_at, account_status = 'active' where id = challenge.user_id;
  insert into public.account_email_verifications(user_id, verified_email, verified_at)
  values (challenge.user_id, requested_email, now_at)
  on conflict (user_id) do update set verified_email = excluded.verified_email, verified_at = excluded.verified_at;
  delete from public.email_verification_challenges where user_id = challenge.user_id;
  return true;
end;
$$;
revoke all on function public.verify_email_verification_code(text, text) from public, anon, authenticated;
grant execute on function public.verify_email_verification_code(text, text) to authenticated;

create or replace function public.create_group_invitation(target_group uuid, target_email text, target_token_hash text, target_invitee_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  invitee_email text := lower(btrim(target_email));
  invitation_id uuid;
  now_at timestamptz := pg_catalog.clock_timestamp();
  recent_invites integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not public.current_account_email_verified() then raise exception 'A verified account is required'; end if;
  if not public.has_group_permission(target_group,'members:invite') then raise exception 'Invitation permission required'; end if;
  if invitee_email is null or char_length(invitee_email) not between 3 and 254
     or invitee_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Enter a valid invitation email'; end if;
  if target_token_hash is null or target_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation token'; end if;
  if target_invitee_name is not null and char_length(btrim(target_invitee_name)) not between 2 and 120 then raise exception 'Invitee name must be between 2 and 120 characters'; end if;
  if not exists(select 1 from public.groups g where g.id = target_group) then raise exception 'Group not found'; end if;
  if exists(select 1 from public.group_system_controls c where c.group_id = target_group and c.status in ('locked','maintenance')) then raise exception 'This group is not accepting invitations'; end if;
  if exists(
    select 1 from public.members m left join public.profiles p on p.id = m.user_id
    where m.group_id = target_group and m.status = 'active'
      and (lower(btrim(coalesce(m.email,''))) = invitee_email or p.normalized_email = invitee_email)
  ) then raise exception 'This person is already a member of the group'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('group-invite:' || target_group::text || ':' || invitee_email,0));
  select count(*) into recent_invites from public.group_invitations i where i.invited_by = actor_id and i.created_at > now_at - interval '1 hour';
  if recent_invites >= 20 then raise exception 'Invitation rate limit reached'; end if;
  select count(*) into recent_invites from public.group_invitations i where i.group_id = target_group and i.email = invitee_email and i.created_at > now_at - interval '24 hours';
  if recent_invites >= 3 then raise exception 'This email has already been invited recently'; end if;
  insert into public.group_invitations(group_id,email,token_hash,invited_by,expires_at,invitee_name)
  values(target_group,invitee_email,target_token_hash,actor_id,public.group_invitation_expiration(now_at),nullif(btrim(target_invitee_name),''))
  returning id into invitation_id;
  return invitation_id;
end;
$$;
revoke all on function public.create_group_invitation(uuid, text, text, text) from public, anon;
grant execute on function public.create_group_invitation(uuid, text, text, text) to authenticated;
