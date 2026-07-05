# SecureTag — Setup

Production build: Next.js + Supabase (Auth, Postgres, RLS, Realtime). Consent-
gated contact sharing, Lost Mode, DB-driven roles, and email alerts.

## The flow
- **Landing** → product info + Login/Register.
- **Admin** (role in DB) → `/dashboard`: all tags, generate codes, bulk ZIP /
  PNG download, and **`/dashboard/users`** to promote/demote admins.
- **Scan a registered tag** → scanner picks a reason (+ optional note). The
  owner is alerted **live in-app and by email**. The scanner sees **nothing**
  until the owner taps **Accept** (or **Decline**). No number is ever exposed
  without consent.
- **Lost Mode** → owner flips it on; scans then auto-share contact and the
  scanner can share their live location to help locate the car.
- **Scan an unregistered tag** → must log in / register, then activate it.

## One-time Supabase setup (3 steps)

### 1. Run the schema
Supabase Dashboard → **SQL Editor** → paste all of
[`supabase-schema.sql`](./supabase-schema.sql) → **Run**. It is idempotent and
creates `profiles` (+ auto-create trigger), `tags` (adds `lost_mode`),
`scan_requests`, RLS policies, enables Realtime, and backfills profiles.

### 2. Turn off email confirmation
Authentication → Providers → Email → turn **OFF** "Confirm email" → Save (so
login works instantly).

### 3. Seed your first admin
Register your account in the app first (so the profile exists), then in SQL
Editor run:
```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```
(The schema already includes this line for `bhargav@pixiverse.in` — re-run it
after you've registered.) From then on, admins are managed in-app at
**/dashboard/users** — no admin credentials in any env file.

## Optional: email alerts
Owner scan-alert emails use **Resend**. Add to `.env.local`:
```
RESEND_API_KEY=re_xxx
EMAIL_FROM=SecureTag <onboarding@resend.dev>
```
Leave blank to disable — in-app realtime alerts still work.

## Run
```bash
npm run dev
```
Open http://localhost:3100

## Test the full flow
1. Register → run the admin seed SQL → refresh: you get the **admin** dashboard.
2. Generate codes → select → **Download ZIP**.
3. Open an unregistered tag in a normal browser, register a second account,
   activate it with vehicle details.
4. In a **different browser / incognito** (logged out), open that tag → pick a
   reason → **Send request**. Keep it open.
5. As the owner, watch the request appear **live** → tap **Accept** → the
   scanner's page reveals your contact within ~2s.
6. Toggle **Lost Mode** on the owner's tag and scan again → contact shows
   instantly + a "Share my location" button.

## Deploy
Push to Vercel, set the same env vars (+ `NEXT_PUBLIC_BASE_URL` = your domain).
Supabase works in prod as-is.
