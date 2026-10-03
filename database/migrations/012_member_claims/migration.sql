create or replace function public.claim_member(target_member uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare claimed_member uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  update public.members as m
  set user_id = auth.uid()
  from auth.users as u
  where m.id = target_member
    and m.status = 'active'
    and m.user_id is null
    and u.id = auth.uid()
    and u.email_confirmed_at is not null
    and lower(btrim(m.email)) = lower(btrim(u.email))
  returning m.id into claimed_member;

  if claimed_member is null then
    raise exception 'No unlinked active member record matches the verified account email';
  end if;
  return claimed_member;
end;
$$;

create unique index members_group_normalized_email_idx
  on public.members(group_id, lower(btrim(email)))
  where email is not null;

revoke all on function public.claim_member(uuid) from public;
grant execute on function public.claim_member(uuid) to authenticated;
