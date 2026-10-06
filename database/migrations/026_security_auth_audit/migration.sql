-- Group security reviewers may see successful and failed authentication events
-- associated with users who belong to or hold a role in that group. The global
-- account audit rows remain unavailable through group-scoped policies.
drop policy if exists audit_logs_read_security_events on public.audit_logs;
create policy audit_logs_read_security_events on public.audit_logs
for select to authenticated using (
  entity = 'account_security_events'
  and group_id is not null
  and public.has_group_permission(group_id, 'security:audit')
);
