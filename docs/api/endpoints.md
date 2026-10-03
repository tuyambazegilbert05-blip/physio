# Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an email-verified Supabase Auth account |
| POST | `/api/auth/login` | Sign in with email and password |
| POST | `/api/auth/logout` | Revoke the current session |
| GET | `/auth/callback` | Exchange a verified email or recovery link for a session |
| GET, PATCH | `/api/users` | Read or update the current profile; list/mark own notifications |
| GET, POST | `/api/groups` | List authorized groups or create a group and chair membership |
| GET, POST | `/api/members` | List or add group members |
| POST | `/api/members/claim` | Link the signed-in account to a matching verified member email |
| GET, POST, PATCH | `/api/contributions` | List, record pending, or review contributions |
| GET | `/api/savings` | Read the security-invoker savings summary |
| GET, POST, PATCH | `/api/loans` | List, apply, or decide loan applications |
| POST | `/api/loans/{loanId}/repayments` | Record a leader-confirmed repayment |
| GET, POST | `/api/meetings` | List or schedule group meetings |
| GET | `/api/reports` | Read financial or member report rows |
