import Constants from 'expo-constants';
import { Platform } from 'react-native';

/* Where the app talks to.
   - Supabase: sign-in and live updates (public URL + anon key only).
   - API: the SecureTag website, which holds all the business rules.

   In development the API defaults to the Next.js dev server on the same
   computer that runs `expo start` (port 4100, `npm run dev:mobile`), so a phone on the same Wi-Fi
   just works. Set EXPO_PUBLIC_API_URL to override. */

const trim = (v: string | undefined) => (v || '').trim().replace(/\/+$/, '');

export const SUPABASE_URL = trim(process.env.EXPO_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

/** Public website: QR codes point here, and "forgot password" opens it. */
export const WEB_URL = trim(process.env.EXPO_PUBLIC_WEB_URL) || 'https://securetag.in';

const DEV_API_PORT = 4100;

function devApiUrl(): string | null {
  if (!__DEV__) return null;
  if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${host}:${DEV_API_PORT}`;
  }
  // "192.168.1.11:8081" → the computer running Metro.
  const hostUri = Constants.expoConfig?.hostUri || '';
  const host = hostUri.split(':')[0];
  // Tunnel hosts (*.exp.direct) can't reach a local port; fall through.
  if (!host || !/^[\d.]+$|^localhost$/.test(host)) return null;
  return `http://${host}:${DEV_API_PORT}`;
}

/* securetag.in redirects to www, and a redirect to another host drops the
   login header on the way. So API calls go straight to www. */
const PROD_API_URL = 'https://www.securetag.in';

export const API_URL = trim(process.env.EXPO_PUBLIC_API_URL) || devApiUrl() || PROD_API_URL;

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const tagUrl = (id: string) => `${WEB_URL}/tag/${id}`;
export const itemUrl = (code: string) => `${WEB_URL}/found/${code}`;
