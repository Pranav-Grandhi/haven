import type { DisasterMode } from '../types';

export const DISASTER_MODES: Record<
  DisasterMode,
  { label: string; shortLabel: string; icon: string }
> = {
  earthquake: { label: 'Earthquake', shortLabel: 'Quake', icon: 'earthquake' },
  flood: { label: 'Flood', shortLabel: 'Flood', icon: 'flood' },
  tornado: { label: 'Tornado', shortLabel: 'Tornado', icon: 'tornado' },
  blast: { label: 'Blast / Explosion', shortLabel: 'Blast', icon: 'blast' },
  fire: { label: 'Fire', shortLabel: 'Fire', icon: 'fire' },
  hazmat: { label: 'Hazmat', shortLabel: 'Hazmat', icon: 'hazmat' },
};

export const MVP_MODES: DisasterMode[] = ['earthquake', 'flood', 'tornado'];
