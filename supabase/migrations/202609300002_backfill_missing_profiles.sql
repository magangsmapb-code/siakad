insert into public.profiles (id, email, full_name, role)
select
  auth_user.id,
  auth_user.email,
  coalesce(nullif(trim(auth_user.raw_user_meta_data ->> 'full_name'), ''), ''),
  'MURID'
from auth.users as auth_user
where not exists (
  select 1
  from public.profiles as profile
  where profile.id = auth_user.id
)
on conflict (id) do nothing;
