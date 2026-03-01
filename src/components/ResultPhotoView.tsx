import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useStore } from '../state/store';
import { RoomSummaryCard } from './RoomSummaryCard';
import type { SafetyZone, ExitRoute } from '../types';

// ─── Overlay helpers ─────────────────────────────────────────────────────────

function zoneStyle(z: SafetyZone, isTopSafe: boolean) {
  if (z.type === 'exit') {
    return { border: '#3b82f6', bg: 'rgba(59,130,246,0.22)', width: 3 };
  }
  if (isTopSafe) {
    return { border: '#22c55e', bg: 'rgba(34,197,94,0.32)', width: 4 };
  }
  if (z.type === 'safe') {
    return { border: '#22c55e', bg: 'rgba(34,197,94,0.18)', width: 2 };
  }
  if (z.type === 'danger' || z.type === 'caution') {
    return { border: '#ef4444', bg: 'rgba(239,68,68,0.22)', width: 2 };
  }
  return { border: '#eab308', bg: 'rgba(234,179,8,0.18)', width: 2 };
}

function zoneTag(z: SafetyZone, isTopSafe: boolean): string {
  if (z.type === 'exit') return '→ EXIT';
  if (isTopSafe) return '★ SAFEST';
  if (z.type === 'safe') return 'SAFE';
  if (z.type === 'danger' || z.type === 'caution') return '✕ AVOID';
  return '⚠ CAUTION';
}

/**
 * Photo overlay: zone boxes with color-coded labels.
 * Rendering order: danger → caution → safe → exit → topSafe (last = on top).
 */
function ResultPhotoOverlay({
  zones,
  layoutWidth,
  layoutHeight,
}: {
  zones: SafetyZone[];
  layoutWidth: number;
  layoutHeight: number;
}) {
  if (!zones.length) return null;

  const topSafe = zones
    .filter((z) => z.type === 'safe')
    .sort((a, b) => a.priority - b.priority)[0];

  const typeOrder: Record<string, number> = { danger: 0, caution: 1, safe: 2, exit: 3 };
  const sorted = [...zones].sort(
    (a, b) => (typeOrder[a.type] ?? 2) - (typeOrder[b.type] ?? 2)
  );
  // Render topSafe last so its thicker border sits on top
  const ordered = topSafe
    ? [...sorted.filter((z) => z !== topSafe), topSafe]
    : sorted;

  return (
    <View
      style={[StyleSheet.absoluteFill, { width: layoutWidth, height: layoutHeight }]}
      pointerEvents="none"
    >
      {ordered.map((z) => {
        const isTop = z === topSafe;
        const left = z.bbox.x1 * layoutWidth;
        const top = z.bbox.y1 * layoutHeight;
        const w = Math.max((z.bbox.x2 - z.bbox.x1) * layoutWidth, 52);
        const h = Math.max((z.bbox.y2 - z.bbox.y1) * layoutHeight, 36);
        const { border, bg, width } = zoneStyle(z, isTop);
        const tag = zoneTag(z, isTop);

        return (
          <View
            key={z.id}
            style={[
              overlayStyles.box,
              { left, top, width: w, height: h, borderColor: border, backgroundColor: bg, borderWidth: width },
            ]}
          >
            {isTop && <View style={[overlayStyles.topBadgeBg, { borderColor: border }]} />}
            <Text style={[overlayStyles.tag, { color: border, fontSize: isTop ? 12 : 11 }]} numberOfLines={1}>
              {tag}
            </Text>
            {z.short_description ? (
              <Text style={overlayStyles.hint} numberOfLines={1}>
                {z.short_description}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderRadius: 8,
    padding: 5,
    justifyContent: 'flex-end',
  },
  topBadgeBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  tag: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 1,
  },
});

// ─── Safest Spot Banner ───────────────────────────────────────────────────────

function SafestBanner({ zone }: { zone: SafetyZone }) {
  return (
    <View style={bannerStyles.container}>
      <View style={bannerStyles.header}>
        <Text style={bannerStyles.star}>★</Text>
        <Text style={bannerStyles.title}>Safest Spot</Text>
        <View style={bannerStyles.pill}>
          <Text style={bannerStyles.pillText}>GO HERE</Text>
        </View>
      </View>
      <Text style={bannerStyles.object}>{zone.short_description}</Text>
      <Text style={bannerStyles.reason} numberOfLines={3}>
        {zone.detailed_reasoning}
      </Text>
      {zone.action ? (
        <Text style={bannerStyles.action}>{zone.action}</Text>
      ) : null}
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1.5,
    borderColor: '#22c55e',
    borderRadius: 12,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  star: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    color: '#22c55e',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  pill: {
    backgroundColor: '#22c55e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  object: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  reason: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 19,
  },
  action: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
});

// ─── Exit Routes Panel ────────────────────────────────────────────────────────

function ExitRoutesPanel({ routes }: { routes: ExitRoute[] }) {
  if (!routes.length) return null;
  return (
    <View style={exitStyles.container}>
      <Text style={exitStyles.title}>Exit Routes</Text>
      {routes.map((r, i) => (
        <View key={r.id} style={exitStyles.row}>
          <Text style={exitStyles.number}>{i + 1}</Text>
          <View style={exitStyles.info}>
            <Text style={exitStyles.label}>{r.path_description}</Text>
            {r.notes ? <Text style={exitStyles.note}>{r.notes}</Text> : null}
            {r.is_blocked && <Text style={exitStyles.blocked}>BLOCKED — do not use</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

const exitStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.45)',
    borderRadius: 12,
    padding: 14,
  },
  title: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  number: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '800',
    width: 20,
    textAlign: 'center',
  },
  info: { flex: 1 },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  note: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginTop: 2,
  },
  blocked: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});

// ─── Danger Zone Summary ──────────────────────────────────────────────────────

function DangerSummary({ zones }: { zones: SafetyZone[] }) {
  const dangers = zones.filter((z) => z.type === 'danger' || z.type === 'caution');
  if (!dangers.length) return null;
  return (
    <View style={dangerStyles.container}>
      <Text style={dangerStyles.title}>✕ Avoid These Areas</Text>
      {dangers.map((z) => (
        <Text key={z.id} style={dangerStyles.item} numberOfLines={2}>
          • {z.short_description} — {z.detailed_reasoning?.slice(0, 80)}
        </Text>
      ))}
    </View>
  );
}

const dangerStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: 12,
    padding: 14,
  },
  title: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  item: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Shows the panoramic scan result:
 *  - Full-width photo with "★ SAFEST", "→ EXIT", "✕ AVOID" overlays
 *  - Safest spot callout card
 *  - Exit routes panel (blue)
 *  - Danger zone summary
 *  - Room summary card (what to do / what to avoid)
 */
export function ResultPhotoView() {
  const { width } = useWindowDimensions();
  const result_photo_uri = useStore((s) => s.result_photo_uri);
  const room_summary = useStore((s) => s.room_summary);
  const current = useStore((s) => s.current);

  if (!result_photo_uri) return null;

  const pw = width - 32;
  const ph = Math.round(pw * 0.75); // 4:3
  const zones = current?.zones ?? [];
  const exitRoutes = current?.exit_routes ?? [];
  const topSafe = zones
    .filter((z) => z.type === 'safe')
    .sort((a, b) => a.priority - b.priority)[0] ?? null;
  const primaryAction = current?.actions?.find((a) => a.priority === 1)?.instruction ?? null;
  const safestOneLiner =
    primaryAction ??
    room_summary?.safest ??
    (topSafe
      ? `${topSafe.short_description || 'Safe area'} — ${topSafe.action || 'Go here'}`
      : 'Move to an interior area away from windows.');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Prominent "safest" answer at top — visible without scrolling */}
      <View style={heroStyles.hero}>
        <Text style={heroStyles.heroLabel}>Safest place to hide</Text>
        <Text style={heroStyles.heroAnswer} numberOfLines={3}>
          {safestOneLiner}
        </Text>
        {room_summary?.safest && room_summary.safest !== safestOneLiner && (
          <Text style={heroStyles.heroAction} numberOfLines={2}>
            {room_summary.safest}
          </Text>
        )}
      </View>

      <Text style={styles.title}>Panoramic Scan Result</Text>

      {/* Result photo with zone overlays */}
      <View style={[styles.photoWrap, { width: pw, height: ph }]}>
        <Image
          source={{ uri: result_photo_uri }}
          style={[styles.photo, { width: pw, height: ph }]}
          resizeMode="cover"
        />
        <ResultPhotoOverlay zones={zones} layoutWidth={pw} layoutHeight={ph} />
      </View>

      {/* Safest spot callout */}
      {topSafe && <SafestBanner zone={topSafe} />}

      {/* Exit routes */}
      <ExitRoutesPanel routes={exitRoutes} />

      {/* Danger summary */}
      <DangerSummary zones={zones} />

      {/* Full room summary (what to do / avoid) */}
      {room_summary && (
        <View style={styles.summaryWrap}>
          <RoomSummaryCard />
        </View>
      )}

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const heroStyles = StyleSheet.create({
  hero: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderWidth: 2,
    borderColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
  },
  heroLabel: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroAnswer: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  heroAction: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 20,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  content: {
    paddingBottom: 32,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  photoWrap: {
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  photo: {
    borderRadius: 12,
  },
  summaryWrap: {
    marginTop: 12,
  },
  bottomPad: {
    height: 16,
  },
});
