# User flows

## Account access

Register with name, email, and password → Physio Fund Cycle creates the account and opaque session → Physio Fund Cycle sends and validates its own email OTP → choose a discoverable group → submit a membership request → wait for authorized approval before member access. Login, MFA, password change, password recovery, logout, and session revocation are also app-owned; PostgreSQL and its RLS remain hosted by Supabase.

## Contribution

Choose a member and period → submit a pending record → an authorized treasurer verifies it → only a verified record updates contribution totals.

## Loan

An active member submits principal, term, and purpose → an authorized group leader approves or rejects → an approved loan can be activated and repayments reduce the outstanding amount.

## Meeting

A chairperson or secretary schedules a group meeting → members see its time, location, and agenda → attendance is associated with that meeting and group.
