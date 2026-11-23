import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/state/session';
import { Icon } from '@/ui/icons';
import { C, MAX_WIDTH, R, shadow } from '@/ui/theme';

/** Floats over every screen when a scan arrives while the app is open. */
export default function AlertBanner() {
  const { banner, dismissBanner } = useSession();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  if (!banner) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Pressable
        accessibilityRole="alert"
        accessibilityLabel={`${banner.title}. ${banner.body}`}
        onPress={() => {
          dismissBanner();
          router.navigate('/alerts');
        }}
        style={styles.banner}>
        <View style={styles.ico}>
          <Icon name="bell" size={18} color={C.white} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {banner.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {banner.body}
          </Text>
        </View>
        <Pressable onPress={dismissBanner} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss">
          <Icon name="x" size={18} color="#c9cbf5" />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center', zIndex: 50 },
  banner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.text,
    borderRadius: R.lg,
    padding: 14,
    ...shadow,
  },
  ico: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { color: C.white, fontWeight: '700', fontSize: 14.5 },
  body: { color: '#c9cbf5', fontSize: 13, lineHeight: 18, marginTop: 1 },
});
