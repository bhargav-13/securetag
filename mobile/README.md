# SecureTag mobile app

The SecureTag website as a phone app (Expo SDK 58, React Native, TypeScript).
For tag **owners** and for anyone who **scans** a tag. Admin work (generating
and printing tags, managing users) stays on the website.

## What it does

| Tab | Logged out | Logged in |
| --- | --- | --- |
| **Home** | Intro, log in / register | Status at a glance, requests waiting for you, your vehicles and items, recent scans |
| **Scan** | QR scanner (camera, torch) or type the code | Same |
| **Alerts** | Prompt to log in | Requests waiting for you + a timeline of every scan; tap one for the map and details |
| **Account** | Log in / register | Notification settings, change password, name and phone, support, log out |

A three-slide introduction shows the first time the app is opened.

Scanning (or typing) a code opens the right screen for it:

- **Blank tag** → register / log in → fill in details → the tag is live.
- **Your own tag** → details, its QR code, Lost Mode switch, edit.
- **Someone's vehicle tag** → pick a reason, the owner is alerted, their
  contact appears only when they tap Accept (immediately in Lost Mode or for
  Emergency / Accident, exactly like the website).
- **Someone's item tag** (luggage, wallet…) → "secured, contact support", or
  the owner's phone / email if they marked it lost.

## Notifications

| Notification | When | Who | Notes |
| --- | --- | --- | --- |
| **Contact request** | A vehicle tag is scanned and a reason picked | Owner | Accept / Decline buttons on the notification |
| **Emergency or accident** | The reason is Emergency or Accident | Owner | Own channel and sound; cannot be switched off |
| **Lost tag / item scanned** | A tag in Lost Mode, or any of the owner's items, is scanned | Owner | Opens the scan with the map |
| **Location shared** | The scanner shares their location afterwards | Owner | Quiet |
| **Owner replied** | The owner accepts or declines | The scanner's phone | Needs `supabase-notifications.sql` to work while the app is closed |
| **Lost Mode reminder** | Lost Mode has been on for a week | Owner | Scheduled on the phone, repeats weekly |

Each type except emergencies has a switch under **Account → Notifications**
(saved on the account, so it follows the person to every phone). Android gets
one channel per type, so sound and vibration can be tuned in system settings.

While the app is open, alerts arrive live (Supabase Realtime, with a 15-second
polling fallback) as an in-app banner plus a notification, and the Alerts tab
and app icon show a badge. While it is closed they arrive as push
notifications — in a real build only, see "Before publishing" below.

The wording and routing live in two places that must stay in step:
`lib/push.ts` + `lib/scan.ts` on the website (what is sent) and
`src/lib/notifications.ts` + `src/state/session.tsx` in the app (channels,
buttons, live alerts).

## Run it on your phone (Expo Go)

You need two terminals, and the phone on the **same Wi-Fi** as this computer.

**1. The website** (the app talks to it), from the repo root:

```
npm run dev:mobile
```

That is the normal site on port 4100, reachable from the phone. (Port 3100 is
sometimes reserved by Windows/Hyper-V; 4100 avoids that.)

**2. The app**, from this `mobile/` folder:

```
npm start
```

Install **Expo Go** from the Play Store / App Store, then scan the QR code the
terminal prints (Android: inside Expo Go; iPhone: with the Camera app).

The app finds the website by itself: it uses the computer that is running
`npm start`, port 4100. If Windows Firewall asks about Node.js, allow it on
private networks. Nothing to configure.

To preview in a browser instead: `npm run web`.

## Configuration

`mobile/.env` (already created, not committed; see `.env.example`):

| Variable | Meaning |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same public values as the website. Never put the service-role key here. |
| `EXPO_PUBLIC_API_URL` | Leave blank in development. Set to `https://securetag.in` once the website with `/api/mobile` is deployed. |
| `EXPO_PUBLIC_WEB_URL` | Site the QR codes point to (`https://securetag.in`). |

## How it fits together

```
phone ── Supabase Auth (login, session)            public anon key
      ── Supabase Realtime (scan_requests, RLS)    live alerts
      ── website /api/mobile/*  (Bearer <jwt>)     every read and write
```

All rules (who may see or change what, validation, alert emails / WhatsApp)
live in the website. The app never talks to the database tables directly, so
there is one place to change behaviour. API routes are in `app/api/mobile/`;
the scan logic shared with the website is `lib/scan.ts`.

```
src/app/            screens (expo-router): (tabs)/, welcome, login, register,
                    tag/[code], request/[id], tag-form, item-form,
                    notifications, password
src/components/     RequestFlow, cards (tag / item / request), MapPreview, AlertBanner
src/state/          session.tsx — who is logged in + their tags, items, requests
src/lib/            api, supabase, config, notifications, device (location, haptics), codes
src/ui/             theme (website colours), kit (buttons, cards…), form, icons
```

## Checks

```
npm run typecheck        # TypeScript
npm run lint             # ESLint
node ../scripts/test-mobile-api.mjs   # from mobile/, with the website running
```

The last one creates throwaway TEST accounts and tags in the real database,
runs 63 checks through every API flow, and deletes what it created.

## Before publishing to the stores

Expo Go is for trying the app. A store release needs a real build:

1. **Deploy the website** so `/api/mobile/*` is live, then set
   `EXPO_PUBLIC_API_URL=https://securetag.in`.
2. `npx eas-cli@latest init` then `npx eas-cli@latest build --platform android`
   (and `ios`). This also gives the app an EAS project id.
3. **Push alerts while the app is closed** start working in that build with no
   code change: the app registers an Expo push token and the website already
   sends to it on every scan. They cannot work in Expo Go on Android (an Expo
   Go limitation), and need the project id from step 2. Android additionally
   needs a Firebase project: put its `google-services.json` in `mobile/`, set
   `android.googleServicesFile` in `app.json`, and upload the FCM V1 service
   account key in the EAS dashboard. The emergency sound
   (`assets/sounds/emergency.wav`) is also only bundled in a real build.
4. App id is `in.securetag.app` (change in `app.json` if you prefer another).
