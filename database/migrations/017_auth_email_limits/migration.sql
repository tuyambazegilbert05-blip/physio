-- Reuse the existing app-owned email rate-limit buckets for password recovery.
-- Only the server-side service-role API can ask whether a recovery send is allowed.
create or replace function public.allow_password_recovery_request(
  target_email_hash text,
  target_ip_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_count integer;
  ip_count integer;
  now_at timestamptz := pg_catalog.clock_timestamp();
begin
  if target_email_hash is null or target_ip_hash is null
     or target_email_hash !~ '^[0-9a-f]{64}$'
     or target_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid email rate-limit request';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('recovery-ip:' || target_ip_hash, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('recovery-email:' || target_email_hash, 0)
  );

  insert into public.auth_email_otp_limits(bucket_kind, bucket_hash, window_started_at, request_count)
  values ('ip', target_ip_hash, now_at, 1)
  on conflict (bucket_kind, bucket_hash) do update set
    request_count = case
      when auth_email_otp_limits.window_started_at < now_at - interval '1 hour' then 1
      else least(auth_email_otp_limits.request_count + 1, 11)
    end,
    window_started_at = case
      when auth_email_otp_limits.window_started_at < now_at - interval '1 hour' then now_at
      else auth_email_otp_limits.window_started_at
    end
  returning request_count into ip_count;
  if ip_count > 10 then return false; end if;

  insert into public.auth_email_otp_limits(bucket_kind, bucket_hash, window_started_at, request_count)
  values ('email', target_email_hash, now_at, 1)
  on conflict (bucket_kind, bucket_hash) do update set
    request_count = case
      when auth_email_otp_limits.window_started_at < now_at - interval '1 hour' then 1
      else least(auth_email_otp_limits.request_count + 1, 4)
    end,
    window_started_at = case
      when auth_email_otp_limits.window_started_at < now_at - interval '1 hour' then now_at
      else auth_email_otp_limits.window_started_at
    end
  returning request_count into email_count;
  if email_count > 3 then return false; end if;

  delete from public.auth_email_otp_limits
  where window_started_at < now_at - interval '1 day';
  return true;
end;
$$;

revoke all on function public.allow_password_recovery_request(text, text)
  from public, anon, authenticated;
grant execute on function public.allow_password_recovery_request(text, text)
  to service_role;
