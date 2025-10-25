-- Seed an admin profile. IMPORTANT: Create the auth user first
-- with email and password via the Supabase Dashboard (Auth > Users):
--   email:    anasitani186@gmail.com
--   password: careeradmin123
-- Then run this SQL to upsert the profile and grant admin role.

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'anasitani186@gmail.com' limit 1;
  if v_user_id is null then
    raise notice 'Auth user not found. Please create the user in Auth first.';
    return;
  end if;

  insert into public.profiles (id, email, username, name, role)
  values (v_user_id, 'anasitani186@gmail.com', 'anasadmin', 'Admin', 'admin')
  on conflict (id) do update
  set email = excluded.email,
      username = excluded.username,
      name = excluded.name,
      role = 'admin';
end $$;

