# Requirements

Users authenticate through Supabase Auth. Membership is independent from group-scoped roles, and a user may hold more than one role. A group creator becomes its chairperson, committee member, and system administrator. Technical roles can be assigned to non-members, and their permissions do not grant financial authority. Granular permission mappings govern membership administration, financial operations, meetings, reports, security, and technical access. Every group-owned record references its group, and PostgreSQL row-level security is the final authorization boundary.

Amounts are whole currency units and validated as positive safe integers at the API. PostgreSQL constraints enforce the persisted range and domain rules. Pending contributions do not affect savings totals. Loan approvals are checked against available funds while holding a transaction-scoped group lock.
