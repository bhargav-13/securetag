import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/* The app uses Supabase directly only for signing in and for live
   scan-request events (protected by row-level security). Everything else goes
   through the website's API. */
export const supabase = createClient(
  SUPABASE_URL || 'https://not-configured.supabase.co',
  SUPABASE_ANON_KEY || 'not-configured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Only refresh the session while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Supabase's auth messages, reworded for people. */
export function friendlyAuthError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return "That email and password don't match. Try again, or use \"Forgot password?\".";
  if (m.includes('not confirmed')) return 'Please confirm your email first. Open the link we sent to your inbox.';
  if (m.includes('already registered')) return 'An account with this email already exists. Log in instead.';
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('network') || m.includes('fetch')) return "Can't reach SecureTag. Check your internet connection.";
  return msg;
}
