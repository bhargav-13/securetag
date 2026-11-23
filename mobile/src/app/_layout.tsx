import { useRouter } from 'expo-router';
import Stack from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import AlertBanner from '@/components/AlertBanner';
import { isConfigured } from '@/lib/config';
import { Notifications } from '@/lib/device';
import { SessionProvider, useSession } from '@/state/session';
import { ShieldMark } from '@/ui/icons';
import { C } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Tapping a scan alert opens the Alerts tab.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as { type?: string } | undefined;
      if (data?.type === 'scan') router.navigate('/alerts');
    });
    return () => sub.remove();
  }, [router]);

  if (!ready) return <View style={styles.boot} />;

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
        <Stack.Screen name="login" options={{ title: 'Log in' }} />
        <Stack.Screen name="register" options={{ title: 'Create account' }} />
        <Stack.Screen name="tag/[code]" options={{ title: 'SecureTag' }} />
        <Stack.Screen name="tag-form" options={{ title: 'Vehicle details' }} />
        <Stack.Screen name="item-form" options={{ title: 'Item details' }} />
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
