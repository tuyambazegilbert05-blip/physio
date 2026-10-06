-- Activate the existing group invitation model with hashed, single-use tokens,
-- explicit lifecycle state, permission checks, and atomic membership activation.

alter table public.group_invitations
  add column if not exists invitee_name text,
  add column if not exists invitee_user_id uuid references auth.users(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists last_delivery_attempt_at timestamptz,
  add column if not exists delivery_attempts integer not null default 0,
  add column if not exists delivery_window_started_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.group_invitations set email = lower(btrim(email));

alter table public.group_invitations
  drop constraint if exists group_invitations_status_check;
alter table public.group_invitations
  add constraint group_invitations_status_check
  check (status in ('pending', 'sent', 'delivery_failed', 'accepted', 'declined', 'expired', 'revoked'));
alter table public.group_invitations
  drop constraint if exists group_invitations_email_check;
alter table public.group_invitations
  add constraint group_invitations_email_check
  check (char_length(email) between 3 and 254 and email = lower(btrim(email)));
alter table public.group_invitations
  drop constraint if exists group_invitations_invitee_name_check;
alter table public.group_invitations
  add constraint group_invitations_invitee_name_check
  check (invitee_name is null or char_length(invitee_name) between 2 and 120);

drop trigger if exists group_invitations_set_updated_at on public.group_invitations;
create trigger group_invitations_set_updated_at before update on public.group_invitations
for each row execute function public.set_updated_at();

update public.group_invitations set status = 'expired'
where status in ('pending', 'sent', 'delivery_failed') and expires_at <= now();
with ranked_active as (
  select id, row_number() over (partition by group_id, email order by created_at desc, id desc) as position
  from public.group_invitations
  where status in ('pending', 'sent', 'delivery_failed')
)
update public.group_invitations i set status = 'revoked', revoked_at = now()
from ranked_active r where r.id = i.id and r.position > 1;

drop index if exists public.group_invitations_one_pending_idx;
create unique index if not exists group_invitations_one_active_email_idx
  on public.group_invitations(group_id, email)
  where status in ('pending', 'sent', 'delivery_failed');
create index if not exists group_invitations_group_created_idx
  on public.group_invitations(group_id, created_at desc);
create index if not exists group_invitations_inviter_created_idx
  on public.group_invitations(invited_by, created_at desc);

alter table public.join_requests drop constraint if exists join_requests_status_check;
alter table public.join_requests add constraint join_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'withdrawn', 'superseded'));

create or replace function public.group_invitation_expiration(target_time timestamptz)
returns timestamptz language sql immutable set search_path = '' as $$
  select target_time + interval '7 days'
$$;
revoke all on function public.group_invitation_expiration(timestamptz) from public, anon, authenticated;

create or replace function public.audit_group_invitation_lifecycle()
returns trigger language plpgsql security definer set search_path = '' as $$
declare event_action text; event_actor uuid; safe_details jsonb;
begin
  if tg_op = 'INSERT' then
    event_action := 'INVITATION_CREATED';
    event_actor := new.invited_by;
    safe_details := jsonb_build_object('email', new.email, 'status', new.status, 'expires_at', new.expires_at);
  elsif old.token_hash is distinct from new.token_hash then
    event_action := 'INVITATION_REISSUED';
    event_actor := auth.uid();
    safe_details := jsonb_build_object('email', new.email, 'status', new.status, 'expires_at', new.expires_at);
  elsif old.status is distinct from new.status then
    event_action := case
      when old.status = 'expired' and new.status = 'pending' then 'INVITATION_REISSUED'
      else case new.status
      when 'sent' then 'INVITATION_SENT'
      when 'delivery_failed' then 'INVITATION_DELIVERY_FAILED'
      when 'accepted' then 'INVITATION_ACCEPTED'
      when 'declined' then 'INVITATION_DECLINED'
      when 'expired' then 'INVITATION_EXPIRED'
      when 'revoked' then 'INVITATION_REVOKED'
      else 'INVITATION_UPDATED'
      end
    end;
    event_actor := case when new.status = 'accepted' then new.accepted_by
      when new.status = 'revoked' then coalesce(auth.uid(), new.invited_by)
      else auth.uid() end;
    safe_details := jsonb_build_object(
      'email', new.email,
      'from_status', old.status,
      'to_status', new.status,
      'invitee_user_id', new.invitee_user_id,
      'expires_at', new.expires_at
    );
  else
    return new;
  end if;

  insert into public.audit_logs(group_id, actor_id, action, entity, entity_id, details)
  values (new.group_id, event_actor, event_action, 'group_invitations', new.id::text, safe_details);
  return new;
end;
$$;
drop trigger if exists invitations_audit on public.group_invitations;
create trigger invitations_audit after insert or update on public.group_invitations
for each row execute function public.audit_group_invitation_lifecycle();

create or replace function public.notify_group_invitation_lifecycle()
returns trigger language plpgsql security definer set search_path = '' as $$
declare group_name text; invitee_name text;
begin
  if tg_op <> 'UPDATE' or old.status is not distinct from new.status then return new; end if;
  if new.status not in ('accepted', 'declined', 'expired', 'revoked', 'delivery_failed') then return new; end if;
  select g.name into group_name from public.groups g where g.id = new.group_id;
  if group_name is null then return new; end if;
  select coalesce(nullif(p.full_name, ''), split_part(u.email, '@', 1))
    into invitee_name
  from auth.users u left join public.profiles p on p.id = u.id
  where u.id = new.invitee_user_id;

  insert into public.notifications(user_id, title, body, href)
  values (
    new.invited_by,
    case new.status
      when 'accepted' then 'Group invitation accepted'
      when 'declined' then 'Group invitation declined'
      when 'expired' then 'Group invitation expired'
      when 'revoked' then 'Group invitation revoked'
      else 'Invitation email could not be delivered'
    end,
    case new.status
      when 'accepted' then coalesce(invitee_name, new.email) || ' accepted your invitation to join ' || group_name || '.'
      when 'declined' then new.email || ' declined your invitation to join ' || group_name || '.'
      when 'expired' then 'Your invitation to ' || new.email || ' for ' || group_name || ' expired.'
      when 'revoked' then 'The invitation to ' || new.email || ' for ' || group_name || ' was revoked.'
      else 'The invitation to ' || new.email || ' for ' || group_name || ' could not be delivered. You can retry it from Invitations.'
    end,
    '/dashboard/invitations'
  );

  if new.status = 'accepted' and new.invitee_user_id is not null then
    insert into public.notifications(user_id, title, body, href)
    values (
      new.invitee_user_id,
      'Welcome to ' || group_name,
      'Your membership is active. Open your personal Member space to get started.',
      '/dashboard?group=' || new.group_id::text
    );
  end if;
  return new;
end;
$$;
drop trigger if exists group_invitations_notify on public.group_invitations;
create trigger group_invitations_notify after update of status on public.group_invitations
for each row execute function public.notify_group_invitation_lifecycle();

drop policy if exists invitations_read on public.group_invitations;
drop policy if exists invitations_manage on public.group_invitations;
create policy invitations_read on public.group_invitations for select to authenticated
using (public.has_group_permission(group_id, 'members:invite'));
revoke all on public.group_invitations from anon, authenticated;
-- Migration 014 granted column-level write access. Revoke those grants too;
-- invitation changes must go through the permission-checked RPCs.
revoke insert (group_id, email, token_hash, invited_by, expires_at),
  update (status, accepted_by) on public.group_invitations from anon, authenticated;
-- Never expose token_hash through a direct table read.
grant select (id, group_id, email, status, invited_by, invitee_name, invitee_user_id,
  expires_at, accepted_by, accepted_at, declined_at, revoked_at, sent_at,
  last_delivery_attempt_at, delivery_attempts, created_at, updated_at)
  on public.group_invitations to authenticated;
grant all on public.group_invitations to service_role;

create or replace function public.create_group_invitation(
  target_group uuid,
  target_email text,
  target_token_hash text,
  target_invitee_name text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); normalized_email text := lower(btrim(target_email));
  invitation_id uuid; now_at timestamptz := pg_catalog.clock_timestamp(); recent_invites integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not public.current_account_email_verified() then raise exception 'A verified account is required'; end if;
  if not public.has_group_permission(target_group, 'members:invite') then raise exception 'Invitation permission required'; end if;
  if normalized_email is null or char_length(normalized_email) not between 3 and 254
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Enter a valid invitation email';
  end if;
  if target_token_hash is null or target_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation token'; end if;
  if target_invitee_name is not null and char_length(btrim(target_invitee_name)) not between 2 and 120 then
    raise exception 'Invitee name must be between 2 and 120 characters';
  end if;
  if not exists (select 1 from public.groups g where g.id = target_group) then raise exception 'Group not found'; end if;
  if exists (select 1 from public.group_system_controls c where c.group_id = target_group and c.status in ('locked', 'maintenance')) then
    raise exception 'This group is not accepting invitations';
  end if;
  if exists (
    select 1 from public.members m left join auth.users u on u.id = m.user_id
    where m.group_id = target_group and m.status = 'active'
      and (lower(btrim(coalesce(m.email, ''))) = normalized_email or lower(u.email) = normalized_email)
  ) then raise exception 'This person is already a member of the group'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('group-invite:' || target_group::text || ':' || normalized_email, 0));
  select count(*) into recent_invites from public.group_invitations i
  where i.invited_by = actor_id and i.created_at > now_at - interval '1 hour';
  if recent_invites >= 20 then raise exception 'Invitation rate limit reached'; end if;
  select count(*) into recent_invites from public.group_invitations i
  where i.group_id = target_group and i.email = normalized_email and i.created_at > now_at - interval '24 hours';
  if recent_invites >= 3 then raise exception 'This email has already been invited recently'; end if;

  insert into public.group_invitations(group_id, email, token_hash, invited_by, expires_at, invitee_name)
  values (target_group, normalized_email, target_token_hash, actor_id,
    public.group_invitation_expiration(now_at), nullif(btrim(target_invitee_name), ''))
  returning id into invitation_id;
  return invitation_id;
end;
$$;

create or replace function public.resend_group_invitation(target_invitation uuid, target_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invite public.group_invitations%rowtype; now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select i.* into invite from public.group_invitations i where i.id = target_invitation for update;
  if invite.id is null then raise exception 'Invitation not found'; end if;
  if not public.current_account_email_verified() or not public.has_group_permission(invite.group_id, 'members:invite') then
    raise exception 'Invitation permission required';
  end if;
  if invite.status not in ('pending', 'sent', 'delivery_failed', 'expired') then raise exception 'This invitation cannot be resent'; end if;
  if invite.last_delivery_attempt_at is not null and invite.last_delivery_attempt_at > now_at - interval '1 minute' then
    raise exception 'Wait before retrying this invitation';
  end if;
  if invite.delivery_window_started_at > now_at - interval '24 hours' and invite.delivery_attempts >= 5 then
    raise exception 'Invitation delivery limit reached';
  end if;
  if target_token_hash is null or target_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation token'; end if;
  if exists (select 1 from public.group_system_controls c where c.group_id = invite.group_id and c.status in ('locked', 'maintenance')) then
    raise exception 'This group is not accepting invitations';
  end if;
  update public.group_invitations set
    token_hash = target_token_hash,
    status = 'pending',
    expires_at = public.group_invitation_expiration(now_at),
    sent_at = null,
    accepted_at = null,
    declined_at = null,
    revoked_at = null
  where id = invite.id;
  return invite.id;
end;
$$;

create or replace function public.revoke_group_invitation(target_invitation uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare invite public.group_invitations%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select i.* into invite from public.group_invitations i where i.id = target_invitation for update;
  if invite.id is null then raise exception 'Invitation not found'; end if;
  if not public.current_account_email_verified() or not public.has_group_permission(invite.group_id, 'members:invite') then
    raise exception 'Invitation permission required';
  end if;
  if invite.status not in ('pending', 'sent', 'delivery_failed') then raise exception 'This invitation can no longer be revoked'; end if;
  update public.group_invitations set status = 'revoked', revoked_at = now() where id = invite.id;
  return true;
end;
$$;

create or replace function public.mark_group_invitation_delivery(target_invitation uuid, delivery_succeeded boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare next_status text := case when delivery_succeeded then 'sent' else 'delivery_failed' end;
  now_at timestamptz := pg_catalog.clock_timestamp();
begin
  update public.group_invitations set
    status = next_status,
    sent_at = case when delivery_succeeded then now_at else sent_at end,
    last_delivery_attempt_at = now_at,
    delivery_attempts = case
      when delivery_window_started_at is null or delivery_window_started_at <= now_at - interval '24 hours' then 1
      else delivery_attempts + 1
    end,
    delivery_window_started_at = case
      when delivery_window_started_at is null or delivery_window_started_at <= now_at - interval '24 hours' then now_at
      else delivery_window_started_at
    end
  where id = target_invitation and status = 'pending';
  return found;
end;
$$;

create or replace function public.get_group_invitation_status(target_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare invite public.group_invitations%rowtype; result jsonb; group_available boolean;
begin
  if target_token_hash is null or target_token_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('status', 'invalid'); end if;
  select i.* into invite from public.group_invitations i where i.token_hash = target_token_hash for update;
  if invite.id is null then return jsonb_build_object('status', 'invalid'); end if;
  if invite.status in ('pending', 'sent', 'delivery_failed') and invite.expires_at <= now() then
    update public.group_invitations set status = 'expired' where id = invite.id returning * into invite;
  end if;
  select exists (select 1 from public.groups g where g.id = invite.group_id)
    and not exists (select 1 from public.group_system_controls c where c.group_id = invite.group_id and c.status in ('locked', 'maintenance'))
    into group_available;
  result := jsonb_build_object(
    'id', invite.id,
    'status', case when invite.status in ('pending', 'sent', 'delivery_failed') and not group_available then 'unavailable' else invite.status end,
    'email', invite.email,
    'invitee_name', invite.invitee_name,
    'expires_at', invite.expires_at,
    'group_id', invite.group_id,
    'group_name', (select g.name from public.groups g where g.id = invite.group_id),
    'inviter_name', (select p.full_name from public.profiles p where p.id = invite.invited_by),
    'group_available', group_available
  );
  return result;
end;
$$;

create or replace function public.decline_group_invitation(target_token_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare invite public.group_invitations%rowtype;
begin
  if target_token_hash is null or target_token_hash !~ '^[0-9a-f]{64}$' then return 'invalid'; end if;
  select i.* into invite from public.group_invitations i where i.token_hash = target_token_hash for update;
  if invite.id is null then return 'invalid'; end if;
  if invite.status in ('pending', 'sent', 'delivery_failed') and invite.expires_at <= now() then
    update public.group_invitations set status = 'expired' where id = invite.id;
    return 'expired';
  end if;
  if invite.status not in ('pending', 'sent', 'delivery_failed') then return invite.status; end if;
  update public.group_invitations set status = 'declined', declined_at = now() where id = invite.id;
  return 'declined';
end;
$$;

create or replace function public.accept_group_invitation(target_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  invite public.group_invitations%rowtype;
  account_email text;
  account_name text;
  group_name text;
  member_row public.members%rowtype;
  new_member_id uuid;
  now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_token_hash is null or target_token_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('status', 'invalid'); end if;
  select i.* into invite from public.group_invitations i where i.token_hash = target_token_hash for update;
  if invite.id is null then return jsonb_build_object('status', 'invalid'); end if;
  if invite.status = 'accepted' then
    if invite.invitee_user_id = auth.uid() then
      return jsonb_build_object('status', 'accepted', 'group_id', invite.group_id);
    end if;
    return jsonb_build_object('status', 'invalid');
  end if;
  if invite.status = 'declined' then return jsonb_build_object('status', 'declined'); end if;
  if invite.status = 'revoked' then return jsonb_build_object('status', 'revoked'); end if;
  if invite.status = 'expired' or invite.expires_at <= now_at then
    if invite.status <> 'expired' then update public.group_invitations set status = 'expired' where id = invite.id; end if;
    return jsonb_build_object('status', 'expired');
  end if;
  if invite.status not in ('pending', 'sent', 'delivery_failed') then return jsonb_build_object('status', 'invalid'); end if;

  select lower(u.email), coalesce(nullif(p.full_name, ''), split_part(u.email, '@', 1))
    into account_email, account_name
  from auth.users u left join public.profiles p on p.id = u.id
  where u.id = auth.uid() and u.email_confirmed_at is not null;
  if account_email is null then return jsonb_build_object('status', 'account_unverified'); end if;
  if account_email <> invite.email then return jsonb_build_object('status', 'email_mismatch'); end if;

  select g.name into group_name from public.groups g where g.id = invite.group_id for update;
  if group_name is null or exists (
    select 1 from public.group_system_controls c where c.group_id = invite.group_id and c.status in ('locked', 'maintenance')
  ) then
    update public.group_invitations set status = 'revoked', revoked_at = now_at where id = invite.id;
    return jsonb_build_object('status', 'unavailable');
  end if;

  select m.* into member_row from public.members m
  where m.group_id = invite.group_id and m.user_id = auth.uid() for update;
  if member_row.id is null then
    select m.* into member_row from public.members m
    where m.group_id = invite.group_id and lower(btrim(coalesce(m.email, ''))) = invite.email for update;
  end if;
  if member_row.id is not null then
    if member_row.status <> 'active' or (member_row.user_id is not null and member_row.user_id <> auth.uid()) then
      return jsonb_build_object('status', 'membership_blocked');
    end if;
    if member_row.user_id is null then
      update public.members set user_id = auth.uid(), full_name = account_name, email = account_email
      where id = member_row.id returning id into new_member_id;
    else
      new_member_id := member_row.id;
    end if;
  else
    insert into public.members(group_id, user_id, full_name, email, status)
    values (invite.group_id, auth.uid(), account_name, account_email, 'active')
    returning id into new_member_id;
  end if;

  insert into public.account_email_verifications(user_id, verified_email, verified_at)
  values (auth.uid(), account_email, now_at)
  on conflict (user_id) do update set verified_email = excluded.verified_email, verified_at = excluded.verified_at;

  update public.join_requests set status = 'superseded', reviewed_by = invite.invited_by,
    reviewed_at = now_at, decision_message = 'Superseded by an accepted group invitation.'
  where group_id = invite.group_id and user_id = auth.uid() and status = 'pending';

  update public.group_invitations set status = 'accepted', accepted_at = now_at,
    accepted_by = auth.uid(), invitee_user_id = auth.uid()
  where id = invite.id;

  return jsonb_build_object('status', 'accepted', 'group_id', invite.group_id,
    'group_name', group_name, 'member_id', new_member_id);
end;
$$;

revoke all on function public.audit_group_invitation_lifecycle() from public, anon, authenticated;
revoke all on function public.notify_group_invitation_lifecycle() from public, anon, authenticated;
revoke all on function public.create_group_invitation(uuid, text, text, text) from public, anon;
revoke all on function public.resend_group_invitation(uuid, text) from public, anon;
revoke all on function public.revoke_group_invitation(uuid) from public, anon;
revoke all on function public.mark_group_invitation_delivery(uuid, boolean) from public, anon, authenticated;
revoke all on function public.get_group_invitation_status(text) from public, anon, authenticated;
revoke all on function public.decline_group_invitation(text) from public, anon, authenticated;
revoke all on function public.accept_group_invitation(text) from public, anon;
grant execute on function public.create_group_invitation(uuid, text, text, text) to authenticated;
grant execute on function public.resend_group_invitation(uuid, text) to authenticated;
grant execute on function public.revoke_group_invitation(uuid) to authenticated;
grant execute on function public.mark_group_invitation_delivery(uuid, boolean) to service_role;
grant execute on function public.get_group_invitation_status(text) to service_role;
grant execute on function public.decline_group_invitation(text) to service_role;
grant execute on function public.accept_group_invitation(text) to authenticated;
