-- Avoid circular RLS evaluation between chat_threads and chat_thread_members.
-- The helper exposes only whether the signed-in user belongs to one thread.
create or replace function public.current_user_is_chat_thread_participant(target_thread uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.chat_thread_members tm
    where tm.thread_id = target_thread
      and tm.user_id = auth.uid()
  )
$$;

revoke all on function public.current_user_is_chat_thread_participant(uuid)
  from public, anon, authenticated;
grant execute on function public.current_user_is_chat_thread_participant(uuid)
  to authenticated;

drop policy if exists chat_threads_read on public.chat_threads;
create policy chat_threads_read on public.chat_threads
for select to authenticated
using (public.current_user_is_chat_thread_participant(id));
