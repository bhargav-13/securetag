-- SecureTag: optional column for the mobile app's "owner replied" notification.
--
-- When someone scans a vehicle tag FROM THE APP and waits for the owner, their
-- phone's push token is kept (encrypted) with the request so the app can tell
-- them the moment the owner accepts or declines. It is cleared once used.
--
-- Safe to run more than once. Without it everything still works; scanners just
-- don't get that one notification while the app is closed.
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.scan_requests add column if not exists scanner_push_token text;

-- PostgREST caches the table shape; refresh it so the API sees the new column.
notify pgrst, 'reload schema';
