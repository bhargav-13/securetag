import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, ShieldMark, type IconName } from '@/ui/icons';
import { Button } from '@/ui/kit';
import { C, GRADIENT, MAX_WIDTH } from '@/ui/theme';

export const INTRO_KEY = 'securetag:intro-seen';

const SLIDES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'qr',
    title: 'One sticker, one scan',
    text: 'Put a SecureTag on your car, bike or bag. Anyone who needs you scans it with their phone camera.',
  },
  {
    icon: 'bell',
    title: 'You hear about it at once',
    text: 'You get the reason, a note and where they are standing, the moment your tag is scanned.',
  },
  {
    icon: 'lock',
    title: 'Your number stays yours',
    text: 'Nobody sees your contact until you tap Accept. Lost something? Turn on Lost Mode and finders can reach you.',
  },
];

/** First-launch introduction: three swipeable slides, shown once. */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const finish = (to: '/' | '/scan' | '/login') => {
    AsyncStorage.setItem(INTRO_KEY, '1').catch(() => {});
    router.replace(to);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (next !== page && next >= 0 && next < SLIDES.length) setPage(next);
  };

  const goTo = (i: number) => scroller.current?.scrollTo({ x: i * width, animated: true });

  return (
    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={styles.brand}>
          <ShieldMark size={24} mono={C.white} />
          <Text style={styles.brandText}>SecureTag</Text>
        </View>
        {!last ? (
          <Pressable onPress={() => finish('/')} hitSlop={12} accessibilityRole="button" style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.pager}>
        {SLIDES.map((s, i) => (
          <View key={s.title} style={[styles.slide, { width }]} accessibilityLabel={`Step ${i + 1} of ${SLIDES.length}. ${s.title}. ${s.text}`}>
            <View style={styles.art}>
              <View style={styles.ringOuter} />
              <View style={styles.ringInner} />
              <View style={styles.artCore}>
                <Icon name={s.icon} size={52} color={C.brand} strokeWidth={1.8} />
              </View>
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.text}>{s.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots} accessibilityRole="progressbar" accessibilityLabel={`Step ${page + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
        {last ? (
          <View style={styles.cta}>
            <Button label="Scan a tag" icon="qr" variant="white" size="lg" onPress={() => finish('/scan')} />
            <Pressable onPress={() => finish('/login')} accessibilityRole="button" style={styles.secondary}>
              <Text style={styles.secondaryText}>I already have an account</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cta}>
            <Button label="Next" icon="arrowRight" variant="white" size="lg" onPress={() => goTo(page + 1)} />
            <View style={styles.secondary} />
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, minHeight: 56 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { color: C.white, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  skipText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700' },

  pager: { flex: 1 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  art: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  ringOuter: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.10)' },
  ringInner: { position: 'absolute', width: 168, height: 168, borderRadius: 84, backgroundColor: 'rgba(255,255,255,0.14)' },
  artCore: { width: 116, height: 116, borderRadius: 36, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.white, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center', maxWidth: 420 },
  text: { color: 'rgba(255,255,255,0.92)', fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 12, maxWidth: 420 },

  bottom: { paddingHorizontal: 24, gap: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotOn: { width: 26, backgroundColor: C.white },
  cta: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  secondaryText: { color: C.white, fontSize: 15, fontWeight: '700' },
});
