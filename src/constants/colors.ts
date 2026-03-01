/**
 * ShelterScan overlay and zone colors (from spec).
 * Theme: deep background, soft surfaces, clear safe/danger/exit accents.
 */

export const THEME = {
  background: '#0a0a12',
  surface: 'rgba(255,255,255,0.06)',
  surfaceBorder: 'rgba(255,255,255,0.09)',
  text: '#f4f4f5',
  textMuted: 'rgba(255,255,255,0.65)',
  safe: '#10b981',
  safeBg: 'rgba(16,185,129,0.15)',
  danger: '#f43f5e',
  dangerBg: 'rgba(244,63,94,0.12)',
  exit: '#0ea5e9',
  exitBg: 'rgba(14,165,233,0.12)',
  radiusCard: 16,
  radiusPill: 12,
} as const;

export const ZONE_COLORS = {
  safe: {
    fill: 'rgba(34, 197, 94, 0.2)',
    border: '#22c55e',
    labelBg: 'rgba(34, 197, 94, 0.9)',
  },
  danger: {
    fill: 'rgba(239, 68, 68, 0.25)',
    border: '#ef4444',
    labelBg: 'rgba(239, 68, 68, 0.9)',
  },
  caution: {
    fill: 'rgba(234, 179, 8, 0.2)',
    border: '#eab308',
    labelBg: 'rgba(234, 179, 8, 0.9)',
  },
  exit: {
    fill: 'rgba(59, 130, 246, 0.2)',
    border: '#3b82f6',
    labelBg: 'rgba(59, 130, 246, 0.9)',
  },
} as const;

export const EXIT_ARROW_COLOR = '#3b82f6';

export const HUD_BACKGROUND = 'rgba(0, 0, 0, 0.7)';
export const DETAIL_CARD_BACKGROUND = 'rgba(0, 0, 0, 0.85)';
