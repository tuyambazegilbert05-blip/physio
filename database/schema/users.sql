create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text,
  normalized_email text unique,
  email_verified_at timestamptz,
  account_status text not null default 'pending_verification'
    check (account_status in ('active', 'pending_verification', 'suspended', 'disabled')),
  phone text,
  avatar_url text,
  password_changed_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Ikimina-owned account identity and profile data; password hashes are stored in private app_password_credentials.';
