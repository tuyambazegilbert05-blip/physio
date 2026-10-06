-- Migration 031: Dedicated Stored Procedures for Migrated Account Claim Email Verification

create or replace function public.issue_account_claim_code(
  target_new_email text,
  target_code_hash text,
  target_ip_hash text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  clean_email text := lower(btrim(target_new_email));
  now_at timestamptz := pg_catalog.clock_timestamp();
  ip_count integer;
  account_count integer;
  is_eligible boolean;
begin
  if account_id is null then raise exception 'Authentication required'; end if;
  if clean_email is null or char_length(clean_email) not between 3 and 254
     or target_code_hash is null or target_code_hash !~ '^[0-9a-f]{64}$'
     or target_ip_hash is null or target_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid claim verification parameters';
  end if;

  -- Ensure caller is a migrated or password-reset-required account
  select (p.is_migrated or p.must_change_password or p.temporary_migration_email)
  into is_eligible
  from public.profiles p
  where p.id = account_id;

  if not coalesce(is_eligible, false) then
    return false;
  end if;

  -- Ensure target email is not taken by another user
  if exists (select 1 from public.profiles where normalized_email = clean_email and id <> account_id) then
    raise exception 'Email already in use';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('otp-ip:' || target_ip_hash, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('otp-account:' || account_id::text, 0));

  -- Rate limit per IP (10 / hr)
  insert into public.auth_email_otp_limits(bucket_kind, bucket_hash, window_started_at, request_count)
  values ('ip', target_ip_hash, now_at, 1)
  on conflict (bucket_kind, bucket_hash) do update set
    request_count = case when auth_email_otp_limits.window_started_at < now_at - interval '1 hour' then 1 else least(auth_email_otp_limits.request_count + 1, 11) end,
    window_started_at = case when auth_email_otp_limits.window_started_at < now_at - interval '1 hour' then now_at else auth_email_otp_limits.window_started_at end
  returning request_count into ip_count;
  if ip_count > 10 then return false; end if;

  -- Rate limit per account (5 / 15min)
  insert into public.auth_email_otp_limits(bucket_kind, bucket_hash, window_started_at, request_count)
  values ('email', account_id::text, now_at, 1)
  on conflict (bucket_kind, bucket_hash) do update set
    request_count = case when auth_email_otp_limits.window_started_at < now_at - interval '15 minutes' then 1 else least(auth_email_otp_limits.request_count + 1, 6) end,
    window_started_at = case when auth_email_otp_limits.window_started_at < now_at - interval '15 minutes' then now_at else auth_email_otp_limits.window_started_at end
  returning request_count into account_count;
  if account_count > 5 then return false; end if;

  -- Upsert challenge with new email
  insert into public.email_verification_challenges(user_id, email, code_hash, expires_at, attempts, created_at)
  values (account_id, clean_email, target_code_hash, now_at + interval '10 minutes', 0, now_at)
  on conflict (user_id) do update set
    email = excluded.email,
    code_hash = excluded.code_hash,
    expires_at = excluded.expires_at,
    attempts = 0,
    created_at = excluded.created_at;

  return true;
end;
$$;

revoke all on function public.issue_account_claim_code(text, text, text) from public, anon;
grant execute on function public.issue_account_claim_code(text, text, text) to authenticated;

create or replace function public.verify_account_claim_code(
  target_new_email text,
  target_code_hash text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  challenge public.email_verification_challenges%rowtype;
  clean_email text := lower(btrim(target_new_email));
  now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if account_id is null or clean_email is null or char_length(clean_email) not between 3 and 254
     or target_code_hash is null or target_code_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  select c.* into challenge
  from public.email_verification_challenges c
  where c.user_id = account_id and lower(c.email) = clean_email
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

  -- Valid code! Delete challenge
  delete from public.email_verification_challenges where user_id = challenge.user_id;
  return true;
end;
$$;

revoke all on function public.verify_account_claim_code(text, text) from public, anon;
grant execute on function public.verify_account_claim_code(text, text) to authenticated;
