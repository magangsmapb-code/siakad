alter table public.profiles
  add column if not exists email text,
  add column if not exists status text not null default 'active',
  add column if not exists phone text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'pending', 'disabled'));

update public.profiles as profile
set email = auth_user.email
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.email is distinct from auth_user.email;

create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email))
  where email is not null;