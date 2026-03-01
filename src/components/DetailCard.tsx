import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { useStore } from '../state/store';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { ZONE_COLORS, DETAIL_CARD_BACKGROUND } from '../constants/colors';
import type { ZoneType } from '../types';
import { useZoneTracking } from '../hooks/useZoneTracking';

export function DetailCard() {
  const expanded_zone_id = useStore((s) => s.expanded_zone_id);
  const show_detail_card = useStore((s) => s.show_detail_card);
  const collapseZone = useStore((s) => s.collapseZone);
  const { displayZones } = useZoneTracking();
  const { speak } = useSpeechSynthesis();

  const zone = displayZones.find((z) => z.id === expanded_zone_id);
  if (!zone || !show_detail_card) return null;

  const colors = ZONE_COLORS[zone.type as ZoneType] ?? ZONE_COLORS.caution;

  const handleReadAloud = () => {
    speak(`${zone.label}. ${zone.detailed_reasoning}`);
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={collapseZone}
    >
      <Pressable style={styles.backdrop} onPress={collapseZone}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.border }]}>{zone.label}</Text>
            <Pressable onPress={collapseZone} hitSlop={16}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>{zone.detailed_reasoning}</Text>
            <Pressable style={[styles.readAloud, { borderColor: colors.border }]} onPress={handleReadAloud}>
              <Text style={styles.readAloudText}>🔊 Read Aloud</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    backgroundColor: DETAIL_CARD_BACKGROUND,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '40%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  close: {
    color: '#fff',
    fontSize: 20,
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 22,
  },
  readAloud: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignSelf: 'flex-start',
  },
  readAloudText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
