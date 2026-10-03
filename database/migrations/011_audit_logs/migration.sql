create table public.audit_logs (
  id bigint generated always as identity primary key,
  group_id uuid references public.groups(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_group_created_idx on public.audit_logs(group_id, created_at desc);

create or replace function public.is_group_member(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.group_id = target_group and m.user_id = auth.uid() and m.status = 'active')
$$;

create or replace function public.current_group_role(target_group uuid)
returns public.group_role language sql stable security definer set search_path = '' as $$
  select m.role from public.members m where m.group_id = target_group and m.user_id = auth.uid() and m.status = 'active' limit 1
$$;
revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.current_group_role(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.current_group_role(uuid) to authenticated;

create or replace function public.apply_loan_repayment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.loans
  set outstanding_amount = outstanding_amount - new.amount,
      status = case when outstanding_amount = new.amount then 'repaid'::public.loan_status else status end
  where id = new.loan_id and status = 'active' and outstanding_amount >= new.amount;
  if not found then raise exception 'Repayment exceeds the outstanding balance or loan is not active'; end if;
  return new;
end;
$$;
create trigger loan_repayments_apply after insert on public.loan_repayments
for each row execute function public.apply_loan_repayment();

create or replace function public.write_financial_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; group_key uuid; row_id text; actor uuid;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  group_key := nullif(row_data ->> 'group_id', '')::uuid;
  row_id := row_data ->> 'id';
  actor := auth.uid();
  insert into public.audit_logs(group_id, actor_id, action, entity, entity_id)
  values (group_key, actor, lower(tg_op), tg_table_name, row_id);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger members_audit after insert or update or delete on public.members
for each row execute function public.write_financial_audit();
create trigger contributions_audit after insert or update or delete on public.contributions
for each row execute function public.write_financial_audit();
create trigger loans_audit after insert or update or delete on public.loans
for each row execute function public.write_financial_audit();
create trigger groups_audit after insert or update or delete on public.groups
for each row execute function public.write_financial_audit();
create trigger meetings_audit after insert or update or delete on public.meetings
for each row execute function public.write_financial_audit();

create or replace function public.notify_financial_decision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_user uuid; record_status text;
begin
  if tg_table_name = 'contributions' then
    if old.status = new.status then return new; end if;
    select user_id into target_user from public.members where id = new.member_id;
    record_status := new.status::text;
    if target_user is not null and record_status in ('verified', 'rejected') then
      insert into public.notifications(user_id, title, body, href)
      values (target_user, 'Contribution ' || record_status, 'Your contribution record has been ' || record_status || '.', '/dashboard/contributions/' || new.id::text);
    end if;
  elsif tg_table_name = 'loans' then
    if old.status = new.status then return new; end if;
    select user_id into target_user from public.members where id = new.member_id;
    record_status := new.status::text;
    if target_user is not null and record_status in ('approved', 'rejected', 'active', 'repaid') then
      insert into public.notifications(user_id, title, body, href)
      values (target_user, 'Loan ' || record_status, 'Your loan status changed to ' || record_status || '.', '/dashboard/loans/' || new.id::text);
    end if;
  end if;
  return new;
end;
$$;
create trigger contributions_notify after update of status on public.contributions
for each row execute function public.notify_financial_decision();
create trigger loans_notify after update of status on public.loans
for each row execute function public.notify_financial_decision();

create or replace function public.guard_loan_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
declare funds numeric;
begin
  if new.status is distinct from old.status then
    if not ((old.status = 'pending' and new.status in ('approved', 'rejected')) or (old.status = 'approved' and new.status = 'active') or (old.status = 'active' and new.status = 'repaid' and new.outstanding_amount = 0)) then
      raise exception 'Invalid loan status transition';
    end if;
    if old.status = 'pending' and new.status = 'approved' then
      perform pg_advisory_xact_lock(hashtextextended(new.group_id::text, 0));
      select available_balance into funds from public.savings_summary where group_id = new.group_id;
      if coalesce(funds, 0) < new.principal then raise exception 'The group does not have enough available funds'; end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger loans_guard_transition before update on public.loans
for each row execute function public.guard_loan_transition();

revoke all on function public.apply_loan_repayment() from public, anon, authenticated;
revoke all on function public.write_financial_audit() from public, anon, authenticated;
revoke all on function public.notify_financial_decision() from public, anon, authenticated;
revoke all on function public.guard_loan_transition() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.contributions enable row level security;
alter table public.savings_adjustments enable row level security;
alter table public.loans enable row level security;
alter table public.loan_repayments enable row level security;
alter table public.meetings enable row level security;
alter table public.attendance enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.profiles, public.groups, public.members, public.contributions,
  public.savings_adjustments, public.loans, public.loan_repayments, public.meetings,
  public.attendance, public.notifications, public.audit_logs, public.savings_summary
  from anon, authenticated;

create policy profiles_read_group on public.profiles for select to authenticated using (id = auth.uid() or exists (select 1 from public.members m where m.user_id = profiles.id and public.is_group_member(m.group_id)));
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy groups_read_member on public.groups for select to authenticated using (public.is_group_member(id));
create policy groups_update_leaders on public.groups for update to authenticated using (public.current_group_role(id) in ('chairperson', 'treasurer')) with check (public.current_group_role(id) in ('chairperson', 'treasurer'));

create policy members_read_group on public.members for select to authenticated using (public.is_group_member(group_id));
create policy members_insert_leaders on public.members for insert to authenticated with check (public.current_group_role(group_id) in ('chairperson', 'secretary'));
create policy members_update_leaders on public.members for update to authenticated using (public.current_group_role(group_id) in ('chairperson', 'secretary')) with check (public.current_group_role(group_id) in ('chairperson', 'secretary'));
create policy members_delete_chair on public.members for delete to authenticated using (public.current_group_role(group_id) = 'chairperson');

create policy contributions_read_group on public.contributions for select to authenticated using (public.is_group_member(group_id));
create policy contributions_insert_member on public.contributions for insert to authenticated with check (status = 'pending' and verified_by is null and verified_at is null and public.is_group_member(group_id) and exists (select 1 from public.members m where m.id = contributions.member_id and m.group_id = contributions.group_id and (m.user_id = auth.uid() or public.current_group_role(contributions.group_id) in ('chairperson', 'treasurer'))));
create policy contributions_verify_leaders on public.contributions for update to authenticated using (public.current_group_role(group_id) in ('chairperson', 'treasurer')) with check (public.current_group_role(group_id) in ('chairperson', 'treasurer'));

create policy savings_adjustment_read on public.savings_adjustments for select to authenticated using (public.is_group_member(group_id));
create policy savings_adjustment_manage on public.savings_adjustments for insert to authenticated with check (created_by = auth.uid() and public.current_group_role(group_id) in ('chairperson', 'treasurer'));
create policy loans_read_group on public.loans for select to authenticated using (public.is_group_member(group_id));
create policy loans_apply_member on public.loans for insert to authenticated with check (status = 'pending' and approved_by is null and principal = outstanding_amount and public.is_group_member(group_id) and exists (select 1 from public.members m where m.id = loans.member_id and m.group_id = loans.group_id and m.user_id = auth.uid()));
create policy loans_decide_leaders on public.loans for update to authenticated using (public.current_group_role(group_id) in ('chairperson', 'treasurer')) with check (public.current_group_role(group_id) in ('chairperson', 'treasurer'));
create policy loan_repayments_read on public.loan_repayments for select to authenticated using (exists (select 1 from public.loans l where l.id = loan_id and public.is_group_member(l.group_id)));
create policy loan_repayments_add_leaders on public.loan_repayments for insert to authenticated with check (received_by = auth.uid() and exists (select 1 from public.loans l where l.id = loan_id and public.current_group_role(l.group_id) in ('chairperson', 'treasurer')));

create policy meetings_read_group on public.meetings for select to authenticated using (public.is_group_member(group_id));
create policy meetings_manage_leaders on public.meetings for all to authenticated using (public.current_group_role(group_id) in ('chairperson', 'secretary')) with check (created_by = auth.uid() and public.current_group_role(group_id) in ('chairperson', 'secretary'));
create policy attendance_read_group on public.attendance for select to authenticated using (exists (select 1 from public.meetings mt where mt.id = meeting_id and public.is_group_member(mt.group_id)));
create policy attendance_manage_leaders on public.attendance for all to authenticated using (exists (select 1 from public.meetings mt where mt.id = meeting_id and public.current_group_role(mt.group_id) in ('chairperson', 'secretary'))) with check (recorded_by = auth.uid() and exists (select 1 from public.meetings mt where mt.id = meeting_id and public.current_group_role(mt.group_id) in ('chairperson', 'secretary')));
create policy notifications_read_self on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update_self on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy audit_logs_read_leaders on public.audit_logs for select to authenticated using (group_id is not null and public.current_group_role(group_id) in ('chairperson', 'treasurer'));

grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;
grant select on public.groups to authenticated;
grant update (name, currency, contribution_amount, contribution_frequency) on public.groups to authenticated;
grant select, delete on public.members to authenticated;
grant insert (group_id, full_name, email, phone, role, status) on public.members to authenticated;
grant update (full_name, email, phone, role, status) on public.members to authenticated;
grant select on public.contributions to authenticated;
grant insert (group_id, member_id, amount, contribution_type, period, reference) on public.contributions to authenticated;
grant update (status, verified_by, verified_at) on public.contributions to authenticated;
grant select, insert on public.savings_adjustments to authenticated;
grant select on public.loans to authenticated;
grant insert (group_id, member_id, principal, outstanding_amount, interest_rate, term_months, purpose) on public.loans to authenticated;
grant update (status, approved_by, due_date) on public.loans to authenticated;
grant select on public.loan_repayments to authenticated;
grant insert (loan_id, amount, received_by, reference) on public.loan_repayments to authenticated;
grant select on public.meetings to authenticated;
grant insert (group_id, title, agenda, location, starts_at, ends_at, created_by) on public.meetings to authenticated;
grant select, insert, update, delete on public.attendance to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.savings_summary to authenticated;
