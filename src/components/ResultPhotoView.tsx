import React, { useState, useEffect } from 'react';
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
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.4)',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#34d399',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  star: {
    color: '#34d399',
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    flex: 1,
  },
  pill: {
    backgroundColor: 'rgba(52,211,153,0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.5)',
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
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.4)',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#60a5fa',
  },
  title: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
      <Text style={dangerStyles.title}>Avoid these areas</Text>
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
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f87171',
  },
  title: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  item: {
    color: 'rgba(226,232,240,0.88)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
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
  const [photoError, setPhotoError] = useState(false);

  // Reset error when a new result photo is set (e.g. after "Scan again")
  useEffect(() => {
    setPhotoError(false);
  }, [result_photo_uri]);

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

      {/* Result photo with zone overlays; fallback if image fails to load */}
      <View style={[styles.photoWrap, { width: pw, height: ph }]}>
        {!photoError ? (
          <Image
            source={{ uri: result_photo_uri }}
            style={[styles.photo, { width: pw, height: ph }]}
            resizeMode="cover"
            onError={() => setPhotoError(true)}
          />
        ) : null}
        {photoError ? (
          <View style={styles.photoFallback}>
            <Text style={styles.photoFallbackText}>Scan photo unavailable</Text>
            <Text style={styles.photoFallbackSubtext}>
              Your safety summary above is still valid. Tap "Scan again" to capture a new room.
            </Text>
          </View>
        ) : null}
        {!photoError && <ResultPhotoOverlay zones={zones} layoutWidth={pw} layoutHeight={ph} />}
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
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.4)',
    borderRadius: 16,
    padding: 18,
    paddingLeft: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#34d399',
  },
  heroLabel: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroAnswer: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
    letterSpacing: 0.2,
  },
  heroAction: {
    color: 'rgba(226,232,240,0.92)',
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
    color: 'rgba(241,245,249,0.85)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  photoWrap: {
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  photo: {
    borderRadius: 14,
  },
  photoFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#252538',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  photoFallbackText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  photoFallbackSubtext: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  summaryWrap: {
    marginTop: 12,
  },
  bottomPad: {
    height: 16,
  },
});
