import { Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { openMaps } from '@/lib/device';
import { Icon } from '@/ui/icons';
import { C } from '@/ui/theme';

import { osmEmbedUrl, styles } from './map-shared';

/** Where the scanner was standing: a small map plus "Open in Maps". */
export default function MapPreview({ lat, lng }: { lat: number; lng: number }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.caption}>
        <Icon name="pin" size={14} color={C.muted} />
        <Text style={styles.captionText}>Scanner&apos;s location</Text>
      </View>
      <View style={styles.map}>
        <WebView
          source={{ uri: osmEmbedUrl(lat, lng) }}
          style={styles.web}
          scrollEnabled={false}
          pointerEvents="none"
          androidLayerType="hardware"
          accessibilityLabel="Map of the scan location"
        />
        <Pressable onPress={() => openMaps(lat, lng)} style={styles.open} accessibilityRole="button" accessibilityLabel="Open in Maps">
          <Icon name="external" size={14} color={C.brandInk} />
          <Text style={styles.openText}>Open in Maps</Text>
        </Pressable>
      </View>
    </View>
  );
}
