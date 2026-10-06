-- Security administrators review access and technical-control history in a
-- dedicated view; they do not receive the general group audit permission.
delete from public.role_permissions
where role_key = 'security_administrator'
  and permission_key = 'audit:read';

-- Keep security audit visibility limited to role assignment and system-control
-- records. The application endpoint applies the same entity scope before
-- returning rows; this policy remains the database-side boundary.
drop policy if exists audit_logs_read_authorized on public.audit_logs;
create policy audit_logs_read_authorized on public.audit_logs for select to authenticated using (
  group_id is not null and (
    (entity in ('contributions','loans','loan_repayments','savings_adjustments','share_transactions','bank_transactions','social_fund_requests','expenses','loan_interest_charges','financial_period_closings','financial_correction_requests','profit_calculations') and public.has_group_permission(group_id,'financial_audit:read'))
    or (entity in ('groups','group_cycles','cycle_members','group_system_controls') and (public.has_group_permission(group_id,'groups:manage') or public.has_group_permission(group_id,'audit:read') or (entity='group_system_controls' and public.has_group_permission(group_id,'security:audit'))))
    or (entity='members' and public.has_group_permission(group_id,'members:read'))
    or (entity in ('meetings','attendance','meeting_decisions','meeting_votes','meeting_documents') and public.has_group_permission(group_id,'meetings:read'))
    or (entity in ('group_role_assignments','chairperson_role','join_requests','group_invitations','group_announcements') and (public.has_group_permission(group_id,'roles:read') or public.has_group_permission(group_id,'roles:manage') or public.has_group_permission(group_id,'audit:read') or (entity='group_role_assignments' and public.has_group_permission(group_id,'security:audit'))))
    or (entity in ('chat_threads','chat_messages') and public.has_group_permission(group_id,'messages:moderate'))
  )
);
