import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ZONE_COLORS } from '../constants/colors';
import type { ZoneType } from '../types';
import type { DisplayZone } from '../hooks/useZoneTracking';

interface ZoneOverlayProps {
  zone: DisplayZone;
  layoutWidth: number;
  layoutHeight: number;
  onPress: () => void;
}

export function ZoneOverlay({ zone, layoutWidth, layoutHeight, onPress }: ZoneOverlayProps) {
  const colors = ZONE_COLORS[zone.type as ZoneType] ?? ZONE_COLORS.caution;
  const left = zone.bbox.x1 * layoutWidth;
  const top = zone.bbox.y1 * layoutHeight;
  const width = (zone.bbox.x2 - zone.bbox.x1) * layoutWidth;
  const height = (zone.bbox.y2 - zone.bbox.y1) * layoutHeight;

  return (
    <Pressable
      style={[
        styles.zone,
        {
          left,
          top,
          width,
          height,
          borderColor: colors.border,
          backgroundColor: colors.fill,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.labelPill, { backgroundColor: colors.labelBg }]}>
        <Text style={styles.labelText} numberOfLines={1}>
          {zone.label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zone: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  labelPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: '90%',
  },
  labelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
