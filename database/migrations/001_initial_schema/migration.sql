create extension if not exists pgcrypto;

create type public.group_role as enum ('chairperson', 'treasurer', 'secretary', 'member');
create type public.member_status as enum ('active', 'inactive', 'suspended');
create type public.contribution_status as enum ('pending', 'verified', 'rejected');
create type public.loan_status as enum ('pending', 'approved', 'rejected', 'active', 'repaid', 'defaulted');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
