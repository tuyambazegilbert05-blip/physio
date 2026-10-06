-- Keep a member's own historical financial view available after their group
-- participation is paused, suspended, or closed. These policies remain
-- self-scoped; assigned group permissions may still grant broader access.

drop policy if exists groups_read_authorized on public.groups;
create policy groups_read_authorized on public.groups for select to authenticated using (
  public.is_group_member(id)
  or exists (select 1 from public.members m where m.group_id = groups.id and m.user_id = auth.uid())
  or exists (
    select 1 from public.group_role_assignments a
    where a.group_id = groups.id and a.user_id = auth.uid()
  )
);

drop policy if exists contributions_read_authorized on public.contributions;
create policy contributions_read_authorized on public.contributions for select to authenticated using (
  public.has_group_permission(group_id, 'contributions:read')
  or exists (
    select 1 from public.members m
    where m.id = contributions.member_id
      and m.group_id = contributions.group_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists loans_read_authorized on public.loans;
create policy loans_read_authorized on public.loans for select to authenticated using (
  public.has_group_permission(group_id, 'loans:read')
  or exists (
    select 1 from public.members m
    where m.id = loans.member_id
      and m.group_id = loans.group_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists group_cycles_read on public.group_cycles;
create policy group_cycles_read on public.group_cycles for select to authenticated using (
  public.is_group_member(group_id)
  or public.has_group_permission(group_id, 'cycles:read')
  or public.has_group_permission(group_id, 'cycles:manage')
  or exists (select 1 from public.members m where m.group_id = group_cycles.group_id and m.user_id = auth.uid())
);

-- Members can open a private conversation with officials, while each thread
-- remains visible only to its participants.
create or replace function public.create_member_official_thread(
  target_group uuid,
  thread_title text,
  first_message text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_thread uuid; official_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.members m
    where m.group_id = target_group and m.user_id = auth.uid() and m.status = 'active'
  ) then raise exception 'An active membership is required to contact Ikimina officials'; end if;
  if thread_title is null or char_length(btrim(thread_title)) not between 3 and 160 then raise exception 'A subject between 3 and 160 characters is required'; end if;
  if first_message is null or char_length(btrim(first_message)) not between 1 and 5000 then raise exception 'A message between 1 and 5000 characters is required'; end if;

  insert into public.chat_threads(group_id, kind, title, created_by)
  values (target_group, 'official', btrim(thread_title), auth.uid())
  returning id into new_thread;
  insert into public.chat_thread_members(thread_id, user_id) values (new_thread, auth.uid());

  insert into public.chat_thread_members(thread_id, user_id)
  select new_thread, assignments.user_id
  from (
    select distinct a.user_id
    from public.group_role_assignments a
    join public.role_permissions rp on rp.role_key = a.role_key
    where a.group_id = target_group
      and a.user_id <> auth.uid()
      and rp.permission_key = 'communications:read'
  ) assignments
  on conflict do nothing;
  get diagnostics official_count = row_count;
  if official_count = 0 then
    insert into public.chat_thread_members(thread_id, user_id)
    select new_thread, g.created_by from public.groups g where g.id = target_group and g.created_by <> auth.uid()
    on conflict do nothing;
  end if;

  insert into public.chat_messages(thread_id, sender_id, body)
  values (new_thread, auth.uid(), btrim(first_message));
  return new_thread;
end;
$$;

revoke all on function public.create_member_official_thread(uuid, text, text) from public, anon;
grant execute on function public.create_member_official_thread(uuid, text, text) to authenticated;

drop policy if exists chat_messages_send on public.chat_messages;
create policy chat_messages_send on public.chat_messages for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.chat_threads t
    join public.chat_thread_members tm on tm.thread_id = t.id and tm.user_id = auth.uid()
    where t.id = chat_messages.thread_id
      and (
        public.has_group_permission(t.group_id, 'communications:send')
        or (
          t.kind = 'official'
          and (
            public.has_group_permission(t.group_id, 'communications:read')
            or exists (
              select 1 from public.members m
              where m.group_id = t.group_id and m.user_id = auth.uid() and m.status = 'active'
            )
          )
        )
      )
  )
);

create or replace function public.notify_chat_thread_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare thread_group uuid; thread_subject text; sender_is_member boolean; recipient uuid; notification_path text;
begin
  select t.group_id, coalesce(t.title, 'Official conversation')
  into thread_group, thread_subject
  from public.chat_threads t where t.id = new.thread_id and t.kind = 'official';
  if thread_group is null then return new; end if;
  select exists (
    select 1 from public.members m
    where m.group_id = thread_group and m.user_id = new.sender_id and m.status = 'active'
  ) into sender_is_member;

  for recipient in
    select tm.user_id from public.chat_thread_members tm
    where tm.thread_id = new.thread_id and tm.user_id <> new.sender_id
  loop
    notification_path := case
      when exists (select 1 from public.members m where m.group_id = thread_group and m.user_id = recipient and m.status = 'active')
        then '/dashboard/my/communications'
      else '/dashboard/communications'
    end;
    insert into public.notifications(user_id, title, body, href)
    values (
      recipient,
      case when sender_is_member then 'New member message' else 'Official replied' end,
      'There is a new message in “' || thread_subject || '”.',
      notification_path
    );
  end loop;
  return new;
end;
$$;

revoke all on function public.notify_chat_thread_message() from public, anon, authenticated;
create trigger chat_messages_notify_participants after insert on public.chat_messages
for each row execute function public.notify_chat_thread_message();
