-- ============================================================
--  SecureTag — URGENT security fix (run once, takes a second)
--  Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- ============================================================
--
--  Problem: the policy `profiles_update_self` let any logged-in user edit
--  their OWN profile row, including the `role` column. From the browser
--  console anyone could run
--      update profiles set role = 'admin' where id = <their id>
--  and get the admin dashboard (every owner's name and phone).
--  Confirmed against the live database on 2026-11-24 with a throwaway account.
--
--  Fix: remove the policy and all direct write access. The website only ever
--  writes profiles from the server (service role), so nothing else changes.

drop policy if exists profiles_update_self on public.profiles;
revoke insert, update, delete on public.profiles from anon, authenticated;

-- Check: this should list ONLY the people you made admin on purpose.
select email, role, created_at from public.profiles where role = 'admin' order by created_at;
