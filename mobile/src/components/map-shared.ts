import { StyleSheet } from 'react-native';

import { C, R } from '@/ui/theme';

export function osmEmbedUrl(lat: number, lng: number) {
  const dLat = 0.006;
  const dLng = 0.008;
  const bbox = `${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export const styles = StyleSheet.create({
  wrap: { marginTop: 12, gap: 6 },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  captionText: { fontSize: 13, color: C.muted, fontWeight: '600' },
  map: { height: 150, borderRadius: R.md, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  web: { flex: 1, backgroundColor: C.bg },
  open: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 36,
  },
  openText: { fontSize: 13, fontWeight: '700', color: C.brandInk },
});
