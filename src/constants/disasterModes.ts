import type { DisasterMode } from '../types';

export const DISASTER_MODES: Record<
  DisasterMode,
  { label: string; shortLabel: string; icon: string }
> = {
  earthquake: { label: 'Earthquake', shortLabel: 'Earthquake', icon: 'earthquake' },
  flood: { label: 'Flood', shortLabel: 'Flood', icon: 'flood' },
  tornado: { label: 'Tornado', shortLabel: 'Tornado', icon: 'tornado' },
  blast: { label: 'Blast / Explosion', shortLabel: 'Blast', icon: 'blast' },
  fire: { label: 'Fire', shortLabel: 'Fire', icon: 'fire' },
  hazmat: { label: 'Hazmat', shortLabel: 'Hazmat', icon: 'hazmat' },
};

/** What might fall, shake, or be dangerous in this disaster — show with 🔴. */
export const MODE_DANGERS: Record<DisasterMode, string[]> = {
  earthquake: [
    'Windows & glass can shatter',
    'Shelves & bookcases may topple',
    'Hanging lights, plants, art can fall',
    'Mirrors can break into sharp pieces',
    'Exterior walls can shed debris',
  ],
  flood: [
    'Basement & ground floor fill first',
    'Electrical outlets & appliances — electrocution risk',
    'Low areas flood quickly',
  ],
  tornado: [
    'Windows can implode from pressure',
    'Exterior walls — wind & flying debris',
    'Garage & top floors — weak or exposed',
    'Large open rooms — no cover',
  ],
  blast: [
    'Glass becomes projectiles',
    'Windows & exterior walls most exposed',
  ],
  fire: [
    'Blocked or single exit — trap risk',
    'Interior rooms with no way out',
  ],
  hazmat: [
    'Vents & HVAC can pull in contaminants',
    'Windows that don’t seal',
  ],
};

/** What is safe cover or where to go — show with 🟢. */
export const MODE_SAFE_COVER: Record<DisasterMode, string[]> = {
  earthquake: [
    'Under a sturdy desk or table',
    'Interior wall, away from windows',
    'Drop, cover, hold on',
  ],
  flood: [
    'Upper floors or high ground',
    'Stairs to higher level (not elevator)',
    'Roof only if instructed and safe',
  ],
  tornado: [
    'Basement or lowest interior level',
    'Small interior room, bathroom, or closet',
    'Away from windows',
  ],
  blast: [
    'Interior room, below window line',
    'Behind solid furniture or column',
    'Face away from windows',
  ],
  fire: [
    'Clear path to exit',
    'Stay low (smoke rises)',
    'Know two ways out',
  ],
  hazmat: [
    'Sealed interior room',
    'Away from vents and intakes',
  ],
};

/** All supported disaster types for room scan and analysis. */
export const ALL_MODES: DisasterMode[] = [
  'earthquake',
  'flood',
  'tornado',
  'blast',
  'fire',
  'hazmat',
];

/** @deprecated Use ALL_MODES for full list. */
export const MVP_MODES: DisasterMode[] = ALL_MODES;
