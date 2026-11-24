import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Stack from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import AlertBanner from '@/components/AlertBanner';
import { showError } from '@/components/cards';
import { api } from '@/lib/api';
import { isConfigured } from '@/lib/config';
import { buzz } from '@/lib/device';
import { ACTION_ACCEPT, ACTION_DECLINE, dismissFor, Notifications } from '@/lib/notifications';
import { SessionProvider, useSession } from '@/state/session';
import { ShieldMark } from '@/ui/icons';
import { C } from '@/ui/theme';

import { INTRO_KEY } from './welcome';

SplashScreen.preventAutoHideAsync().catch(() => {});

// The hook has no web implementation worth calling; Platform never changes.
const useNotificationResponse: () => Notifications.NotificationResponse | null | undefined =
  Platform.OS === 'web' ? () => null : Notifications.useLastNotificationResponse;

type PushData = { type?: string; requestId?: string; tagId?: string; code?: string; scanId?: string; test?: boolean };

/** Opens the right screen when a notification (or one of its buttons) is tapped. */
function useNotificationTaps(enabled: boolean) {
  const router = useRouter();
  const { session, refresh } = useSession();
  const response = useNotificationResponse();
  const handled = useRef<string | null>(null);
  const signedIn = !!session;

  useEffect(() => {
    if (!enabled || !response) return;
    const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
    if (handled.current === key) return;
    handled.current = key;
    // Otherwise the same tap is replayed the next time the app starts.
    Notifications.clearLastNotificationResponseAsync().catch(() => {});

    const data = (response.notification.request.content.data ?? {}) as PushData;
    if (data.test) return;
    const action = response.actionIdentifier;

    const open = () => {
      if (data.type === 'reply' && data.tagId) {
        // The scanner's side: back to the tag, which shows the owner's answer.
        router.push({ pathname: '/tag/[code]', params: { code: data.tagId, kind: 'vehicle' } });
      } else if (data.type === 'reminder') router.navigate('/');
      else if (!signedIn) router.push('/login');
      else if (data.requestId) router.push({ pathname: '/request/[id]', params: { id: data.requestId } });
      else if (data.scanId) router.push({ pathname: '/request/[id]', params: { id: data.scanId, kind: 'item' } });
      else if (data.code) router.push({ pathname: '/tag/[code]', params: { code: data.code, kind: 'legacy' } });
      else router.navigate('/alerts');
    };

    if ((action === ACTION_ACCEPT || action === ACTION_DECLINE) && data.requestId && signedIn) {
      const requestId = data.requestId;
      api
        .respond(requestId, action === ACTION_ACCEPT ? 'accepted' : 'declined')
        .then(() => buzz('success'))
        .catch((e) => showError(e instanceof Error ? e.message : 'Could not save your answer.'))
        .finally(() => {
          dismissFor(requestId);
          refresh().finally(open);
        });
      return;
    }
    open();
  }, [enabled, response, signedIn, router, refresh]);
}

function Shell() {
  const { ready, session } = useSession();
  const router = useRouter();
  // null until we know whether the introduction has been shown before.
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const booted = ready && introSeen !== null;

  useEffect(() => {
    AsyncStorage.getItem(INTRO_KEY)
      .then((v) => setIntroSeen(v === '1'))
      .catch(() => setIntroSeen(true));
  }, []);

  useEffect(() => {
    if (!booted) return;
    SplashScreen.hideAsync().catch(() => {});
    // First launch, and nobody is signed in: show the short introduction.
    if (!introSeen && !session) router.replace('/welcome');
    // Only on boot: later sign-outs must not bring the introduction back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  useNotificationTaps(booted);

  if (!booted) return <View style={styles.boot} />;

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerShadowVisible: false,
          headerTintColor: C.brand,
          headerTitleStyle: { color: C.text, fontWeight: '700' },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: C.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="login" options={{ title: 'Log in' }} />
        <Stack.Screen name="register" options={{ title: 'Create account' }} />
        <Stack.Screen name="tag/[code]" options={{ title: 'SecureTag' }} />
        <Stack.Screen name="request/[id]" options={{ title: 'Scan details' }} />
        <Stack.Screen name="tag-form" options={{ title: 'Vehicle details' }} />
        <Stack.Screen name="item-form" options={{ title: 'Item details' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="password" options={{ title: 'Password' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
      </Stack>
      <AlertBanner />
    </>
  );
}

/** Shown instead of the app when the Supabase keys are missing from `.env`. */
function NotConfigured() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <View style={styles.setup}>
      <ShieldMark size={64} />
      <Text style={styles.setupTitle}>Almost there</Text>
      <Text style={styles.setupText}>
        Copy <Text style={styles.mono}>mobile/.env.example</Text> to <Text style={styles.mono}>mobile/.env</Text>, fill in
        your Supabase URL and anon key, then restart <Text style={styles.mono}>npx expo start</Text>.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      {isConfigured ? (
        <SessionProvider>
          <Shell />
        </SessionProvider>
      ) : (
        <NotConfigured />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: C.bg },
  setup: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  setupTitle: { fontSize: 24, fontWeight: '800', color: C.text },
  setupText: { fontSize: 15, lineHeight: 23, color: C.muted, textAlign: 'center' },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), color: C.brandInk },
});
