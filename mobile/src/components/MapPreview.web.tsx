import { createElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import { openMaps } from '@/lib/device';
import { Icon } from '@/ui/icons';
import { C } from '@/ui/theme';

import { osmEmbedUrl, styles } from './map-shared';

/** Web build: the same OpenStreetMap embed in an iframe (no WebView on web). */
export default function MapPreview({ lat, lng }: { lat: number; lng: number }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.caption}>
        <Icon name="pin" size={14} color={C.muted} />
        <Text style={styles.captionText}>Scanner&apos;s location</Text>
      </View>
      <View style={styles.map}>
        {createElement('iframe', {
          src: osmEmbedUrl(lat, lng),
          title: 'Scan location',
          loading: 'lazy',
          style: { border: 0, width: '100%', height: '100%' },
        })}
        <Pressable onPress={() => openMaps(lat, lng)} style={styles.open} accessibilityRole="button">
          <Icon name="external" size={14} color={C.brandInk} />
          <Text style={styles.openText}>Open in Maps</Text>
        </Pressable>
      </View>
    </View>
  );
}
