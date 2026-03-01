import type { DisasterMode } from '../types';

export const DISASTER_MODES: Record<
  DisasterMode,
  { label: string; shortLabel: string; icon: string; emoji: string }
> = {
  earthquake: { label: 'Earthquake', shortLabel: 'Quake',    icon: 'earthquake', emoji: '🌍' },
  flood:      { label: 'Flood',      shortLabel: 'Flood',    icon: 'flood',      emoji: '💧' },
  tornado:    { label: 'Tornado',    shortLabel: 'Tornado',  icon: 'tornado',    emoji: '🌪️' },
  hurricane:  { label: 'Hurricane',  shortLabel: 'Hurricane',icon: 'hurricane',  emoji: '🌀' },
  blast:      { label: 'Explosion',  shortLabel: 'Blast',    icon: 'blast',      emoji: '💥' },
  fire:       { label: 'Fire',       shortLabel: 'Fire',     icon: 'fire',       emoji: '🔥' },
  hazmat:     { label: 'Hazmat',     shortLabel: 'Hazmat',   icon: 'hazmat',     emoji: '☣️' },
  nuclear:    { label: 'Nuclear Fallout', shortLabel: 'Nuclear', icon: 'nuclear', emoji: '☢️' },
  lockdown:   { label: 'Lockdown',   shortLabel: 'Lockdown', icon: 'lockdown',   emoji: '🔒' },
  winter:     { label: 'Winter Storm', shortLabel: 'Winter', icon: 'winter',     emoji: '❄️' },
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
  hurricane: [
    'Windows & glass doors — flying debris impact',
    'Exterior walls & roof can fail',
    'Garage doors are structurally weak',
    'Flooding possible on ground floor',
    'Downed power lines near exits',
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
    'Windows that don\'t seal',
  ],
  nuclear: [
    'Windows & doors — fallout particles enter through gaps',
    'Vents, HVAC & fireplaces draw in outside air',
    'Upper floors & roof — more radiation exposure',
    'Exterior walls — less shielding from fallout',
  ],
  lockdown: [
    'Windows & glass panels visible from outside',
    'Doors with glass inserts or gaps',
    'Large open rooms with no cover',
    'Hallways & areas near main entrances',
  ],
  winter: [
    'Exterior walls & windows — cold drafts & heat loss',
    'Unheated rooms — hypothermia risk',
    'Garages & basements — poorly insulated',
    'Areas near broken windows or damaged seals',
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
  hurricane: [
    'Lowest interior room — bathroom, closet, or hallway',
    'Away from all windows and exterior walls',
    'Under a staircase for extra structural support',
    'Bathtub with mattress over you for debris protection',
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
  nuclear: [
    'Basement or center of a concrete building — most shielding',
    'Interior rooms with no windows, multiple walls from outside',
    'Seal gaps in windows, doors, and vents',
    'Stay inside for at least 24 hours after fallout',
  ],
  lockdown: [
    'Lockable interior room, away from windows and doors',
    'Barricade door with heavy furniture',
    'Stay below window line — out of sight',
    'Silence phones, turn off lights',
  ],
  winter: [
    'Interior room with insulated walls',
    'Near a heat source — fireplace, radiator, or heating vent',
    'Use curtains and rugs to reduce drafts',
    'Gather emergency supplies — blankets, water, flashlight',
  ],
};

/** Outdoor dangers / things to avoid (for ModeGuide when scan context is outdoor). */
export const MODE_DANGERS_OUTDOOR: Record<DisasterMode, string[]> = {
  earthquake: ['Buildings & falling debris', 'Trees that can fall', 'Power lines', 'Overpasses & bridges'],
  flood: ['Low areas & riverbanks', 'Flowing or standing water', 'Driving through water'],
  tornado: ['Under overpasses', 'Staying in a vehicle in open', 'Near trees'],
  hurricane: ['Outside in wind', 'Flood zones', 'Coastal & low-lying areas'],
  blast: ['Near windows or glass', 'Open areas with no cover'],
  fire: ['Downwind of fire', 'Canyons & heavy fuel areas'],
  hazmat: ['Downwind of release', 'Low areas where chemicals pool'],
  nuclear: ['Open exposure', 'Downwind of plume'],
  lockdown: ['Open areas', 'In line of sight from threat'],
  winter: ['Exposed to wind and wet', 'Hypothermia risk', 'Standing in water or snow'],
};

/** Outdoor safe cover / where to go (for ModeGuide when scan context is outdoor). */
export const MODE_SAFE_COVER_OUTDOOR: Record<DisasterMode, string[]> = {
  earthquake: ['Open ground away from buildings & trees', 'Drop, cover, hold on', 'Away from power lines'],
  flood: ['High ground', 'Elevated structure', 'Move uphill'],
  tornado: ['Low ditch or ravine', 'Lie flat, protect head', 'Sturdy building if reachable'],
  hurricane: ['Sturdy building', 'Interior room away from windows', 'High ground if no shelter'],
  blast: ['Behind solid structure', 'Lie flat', 'Cover head'],
  fire: ['Upwind', 'Cleared or already-burned area', 'Evacuation route'],
  hazmat: ['Upwind and uphill', 'Shelter in building if instructed'],
  nuclear: ['Inside a building', 'Basement or center of structure', 'Stay 24+ hours'],
  lockdown: ['Secure building', 'Lock and barricade', 'Out of sight'],
  winter: ['Heated shelter', 'Vehicle if stranded (engine off, window cracked)', 'Out of wind'],
};

/**
 * Map search query for "find nearest safe shelter" when evacuating.
 * Used to open Apple/Google Maps with a mode-appropriate search.
 */
export const EVACUATION_MAP_QUERY: Record<DisasterMode, string> = {
  earthquake: 'emergency assembly point',
  flood: 'evacuation center',
  tornado: 'storm shelter',
  hurricane: 'emergency shelter',
  blast: 'emergency shelter',
  fire: 'emergency shelter',
  hazmat: 'emergency shelter',
  nuclear: 'emergency shelter',
  lockdown: 'emergency shelter',
  winter: 'warming shelter',
};

export const ALL_MODES: DisasterMode[] = [
  'earthquake', 'flood', 'tornado', 'hurricane',
  'fire', 'blast', 'hazmat', 'nuclear', 'lockdown', 'winter',
];

/** @deprecated use ALL_MODES */
export const MVP_MODES: DisasterMode[] = ALL_MODES;
