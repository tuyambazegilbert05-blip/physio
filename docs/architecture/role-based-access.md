# Role-based access

## Identity model

The validated Physio Fund Cycle application session identifies a person; `public.profiles` retains that account UUID. `public.members` records membership in an Ikimina. `public.group_role_assignments` records one or more responsibilities for a person in a group. A role assignment can exist without a member record, which supports technical staff.

`public.role_permissions` maps the fixed role catalog to granular permissions. PostgreSQL RLS calls `has_group_permission(...)` to authorize data access and mutations. The web interface reads the same permission mapping to show available actions, but database policies remain the enforcement boundary.

The group creator receives `chairperson`, `committee_member`, and `system_administrator`. Those roles combine leadership, governance, and technical access. Financial actions remain permission-specific: the chairperson does not receive contribution verification or loan disbursement by default. A chairperson transfer moves the chairperson, committee, and system-administrator assignments to another active member and is audited.

## Role responsibilities

| Role | Main access |
| --- | --- |
| Member | Own membership and financial records, contributions, loan applications, group meetings, and member communications |
| Chairperson | Group and member oversight, loan approval, meeting administration, reports, and chairperson default technical access |
| Committee member | Group oversight, financial summaries, loan review, reports, and governance decisions |
| Ikimina administrator | Group operations, member administration, meetings, announcements, and reports |
| Treasurer | Contributions and payment verification, loan disbursement and repayment records, financial adjustments, shares, social fund, and profit calculations |
| Secretary | Member administration, meetings, announcements, documentation, and cycle records |
| System administrator | Role assignments, technical configuration, maintenance, module controls, monitoring, backups, and technical audit access |
| Technician | Technical support and system monitoring without member or financial access by default |
| Security administrator | Security configuration and security-event review without financial authority by default |
| Super administrator | Exceptional, explicitly granted elevated access; another super administrator is required to grant or remove this role |

Membership grants personal access separately from these assigned roles. The General Assembly remains a group decision-making body, not a user role.

## Assignment and audit rules

- The access-control screen assigns roles to registered account emails. The selected account does not need to be an Ikimina member unless the role specifically requires membership, such as becoming chairperson.
- A system administrator or super administrator can assign technical roles. Only an existing super administrator can grant or remove super-administrator access.
- Users cannot grant roles to themselves or remove their own role assignments through the standard access screen.
- Audit access follows the audited entity: technical administrators can review role and technical events, while financial audit details require a separate financial-audit permission.
- Role, permission, financial, and operational changes record the actor, permission context, assigned roles, and relevant before/after values in `public.audit_logs`.
- Members see their own contribution and loan records. Group-wide financial records require the corresponding permission.

The role catalog also names permissions for communications, social-fund management, profit distribution, group cycles, and system controls. Their supporting product modules are not all present yet; adding a permission does not create the underlying workflow.

Members can submit their own contribution and loan application records. Loan-repayment posting is currently reserved for the Treasurer, and the product does not yet have a repayment schedule or a member payment-status workflow for principal and interest. Social contributions can be recorded and reviewed as contribution records, but dedicated social-fund expense management is not available yet.

All assignments in this implementation are scoped to an Ikimina. The optional `super_administrator` assignment therefore applies to one group; a platform-wide super-administrator identity and cross-group control center are not part of this change.
