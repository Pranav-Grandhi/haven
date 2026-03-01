import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ZoneOverlay } from './ZoneOverlay';
import { useZoneTracking } from '../hooks/useZoneTracking';
import { useStore } from '../state/store';

export function OverlayCanvas({
  layoutWidth,
  layoutHeight,
}: {
  layoutWidth: number;
  layoutHeight: number;
}) {
  const { overlayZones, exitRoutes } = useZoneTracking();
  const expandZone = useStore((s) => s.expandZone);

  return (
    <View
      style={[StyleSheet.absoluteFill, { width: layoutWidth, height: layoutHeight }]}
      pointerEvents="box-none"
    >
      {overlayZones.map((zone) => (
        <ZoneOverlay
          key={zone.id}
          zone={zone}
          layoutWidth={layoutWidth}
          layoutHeight={layoutHeight}
          onPress={() => expandZone(zone.id)}
        />
      ))}
      {exitRoutes.length > 0 && (
        <View
          style={[
            styles.exitBadge,
            {
              left: exitRoutes[0].bbox.x1 * layoutWidth,
              top: exitRoutes[0].bbox.y1 * layoutHeight - 28,
            },
          ]}
        >
          <View style={styles.exitArrow} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  exitBadge: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    marginBottom: 4,
  },
});
