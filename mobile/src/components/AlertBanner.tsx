import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NotifyKind } from '@/lib/types';
import { useSession } from '@/state/session';
import { Icon, type IconName } from '@/ui/icons';
import { C, MAX_WIDTH, R, shadow } from '@/ui/theme';

const LOOK: Record<NotifyKind, { icon: IconName; colors: readonly [string, string] }> = {
  emergency: { icon: 'alert', colors: ['#b91c1c', '#dc2626'] },
  request: { icon: 'bell', colors: ['#23254a', '#191b2e'] },
  lost: { icon: 'tag', colors: ['#b45309', '#d97706'] },
  location: { icon: 'pin', colors: ['#23254a', '#191b2e'] },
  reply: { icon: 'send', colors: ['#23254a', '#191b2e'] },
  reminder: { icon: 'clock', colors: ['#23254a', '#191b2e'] },
};

/** Floats over every screen when a scan arrives while the app is open. */
export default function AlertBanner() {
  const { banner, dismissBanner } = useSession();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  if (!banner) return null;
  const look = LOOK[banner.kind];
  const open = () => {
    dismissBanner();
    if (banner.target)
      router.push({ pathname: '/request/[id]', params: { id: banner.target.id, ...(banner.target.item ? { kind: 'item' } : {}) } });
    else router.navigate('/alerts');
  };
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Pressable accessibilityRole="alert" accessibilityLabel={`${banner.title}. ${banner.body}`} onPress={open} style={styles.press}>
        <LinearGradient colors={look.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <View style={styles.ico}>
            <Icon name={look.icon} size={18} color={C.white} />
          </View>
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={2}>
              {banner.title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {banner.body}
            </Text>
          </View>
          <Pressable onPress={dismissBanner} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss" style={styles.close}>
            <Icon name="x" size={18} color="rgba(255,255,255,0.85)" />
          </Pressable>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center', zIndex: 50 },
  press: { width: '100%', maxWidth: MAX_WIDTH, borderRadius: R.lg, ...shadow },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.lg, padding: 14 },
  ico: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { color: C.white, fontWeight: '700', fontSize: 14.5, lineHeight: 19 },
  body: { color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 18, marginTop: 2 },
  close: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
});
