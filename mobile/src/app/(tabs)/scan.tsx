import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { parseScanned } from '@/lib/codes';
import { buzz } from '@/lib/device';
import { Icon, ShieldMark } from '@/ui/icons';
import { Button } from '@/ui/kit';
import { C, MAX_WIDTH, R } from '@/ui/theme';

const FRAME = 240;

export default function Scan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [typing, setTyping] = useState(false);
  const [code, setCode] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const lock = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-arm the scanner every time the tab comes back into view.
  useEffect(() => {
    if (focused) lock.current = false;
  }, [focused]);

  // Leaving the tab switches the torch off for next time.
  useFocusEffect(useCallback(() => () => setTorch(false), []));

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    []
  );

  const flashHint = (text: string) => {
    setHint(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => {
      setHint(null);
      lock.current = false;
    }, 2500);
  };

  const open = (raw: string) => {
    if (lock.current) return;
    const parsed = parseScanned(raw);
    lock.current = true;
    if (!parsed) {
      buzz('warning');
      flashHint("That isn't a SecureTag code.");
      return;
    }
    buzz('success');
    setHint(null);
    setTyping(false);
    setCode('');
    router.push({ pathname: '/tag/[code]', params: { code: parsed.code, ...(parsed.kind ? { kind: parsed.kind } : {}) } });
  };

  const submitTyped = () => {
    lock.current = false;
    const value = code.trim();
    if (!value) return;
    open(value);
  };

  const granted = permission?.granted;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {granted && focused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={typing ? undefined : ({ data }) => open(data)}
        />
      ) : null}

      {/* Dim everything except the scan window. */}
      <View style={[styles.overlay, { paddingTop: insets.top + 16 }]} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <ShieldMark size={22} mono={C.white} />
            <Text style={styles.brandText}>SecureTag</Text>
          </View>
          {granted ? (
            <Pressable
              onPress={() => setTorch((t) => !t)}
              accessibilityRole="button"
              accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
              accessibilityState={{ selected: torch }}
              style={[styles.round, torch && styles.roundOn]}>
              <Icon name="flash" size={20} color={torch ? C.text : C.white} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.middle} pointerEvents="box-none">
          {granted ? (
            <>
              <View style={styles.frame} accessibilityLabel="Point the camera at a SecureTag QR code">
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
              <Text style={[styles.caption, hint && styles.captionWarn]} accessibilityLiveRegion="polite">
                {hint ?? 'Point the camera at a SecureTag QR code'}
              </Text>
            </>
          ) : (
            <View style={styles.permCard}>
              <View style={styles.permIco}>
                <Icon name="qr" size={30} color={C.brand} />
              </View>
              <Text style={styles.permTitle}>Scan a SecureTag</Text>
              <Text style={styles.permText}>
                {permission && !permission.canAskAgain
                  ? 'Camera access is turned off for SecureTag. Turn it on in Settings, or type the code printed under the QR.'
                  : 'Allow the camera to scan the QR on a tag. You can also type the code printed under it.'}
              </Text>
              {permission && !permission.canAskAgain ? (
                <Button label="Open Settings" onPress={() => Linking.openSettings()} style={styles.permBtn} />
              ) : (
                <Button label="Allow camera" icon="qr" onPress={() => requestPermission()} loading={!permission} style={styles.permBtn} />
              )}
            </View>
          )}
        </View>

        <View style={[styles.bottom, { paddingBottom: 16 }]}>
          {typing ? (
            <View style={styles.typeCard}>
              <Text style={styles.typeLabel}>Code printed on the tag</Text>
              <View style={styles.typeRow}>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="e.g. K7PQ2MXA"
                  placeholderTextColor={C.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  maxLength={16}
                  returnKeyType="go"
                  onSubmitEditing={submitTyped}
                  accessibilityLabel="Tag code"
                  style={styles.typeInput}
                />
                <Button label="Open" onPress={submitTyped} disabled={!code.trim()} />
              </View>
              {hint ? <Text style={styles.typeError}>{hint}</Text> : <Text style={styles.typeHint}>Codes are case-sensitive.</Text>}
              <Pressable onPress={() => setTyping(false)} hitSlop={10} accessibilityRole="button" style={styles.typeCancel}>
                <Text style={styles.typeCancelText}>{granted ? 'Back to camera' : 'Cancel'}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setHint(null);
                setTyping(true);
              }}
              accessibilityRole="button"
              style={styles.typeBtn}>
              <Icon name="keyboard" size={18} color={C.white} />
              <Text style={styles.typeBtnText}>Type the code instead</Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const CORNER = 30;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#14152b' },
  overlay: { flex: 1, paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { color: C.white, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundOn: { backgroundColor: C.white },

  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  frame: { width: FRAME, height: FRAME },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: C.white },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 },
  caption: {
    color: C.white,
    fontSize: 14.5,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(20,21,43,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.pill,
    overflow: 'hidden',
  },
  captionWarn: { backgroundColor: C.amber },

  permCard: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  permIco: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  permTitle: { fontSize: 21, fontWeight: '800', color: C.text },
  permText: { fontSize: 14.5, lineHeight: 21, color: C.muted, textAlign: 'center' },
  permBtn: { alignSelf: 'stretch', marginTop: 10 },

  bottom: { alignItems: 'center' },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: R.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  typeBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },
  typeCard: { width: '100%', maxWidth: MAX_WIDTH, backgroundColor: C.surface, borderRadius: R.xl, padding: 18, gap: 8 },
  typeLabel: { fontSize: 13, fontWeight: '600', color: C.text },
  typeRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  typeInput: {
    flex: 1,
    backgroundColor: C.surface2,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    fontSize: 17,
    letterSpacing: 1.5,
    color: C.text,
    minHeight: 48,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  typeHint: { fontSize: 12, color: C.muted },
  typeError: { fontSize: 12.5, color: C.red, fontWeight: '600' },
  typeCancel: { alignSelf: 'center', minHeight: 36, justifyContent: 'center' },
  typeCancelText: { color: C.brand, fontWeight: '700', fontSize: 14 },
});
