import { Platform } from 'react-native';
import type { DisasterMode } from '../types';
import { EVACUATION_MAP_QUERY } from '../constants/disasterModes';

export interface Coords {
  latitude: number;
  longitude: number;
}

/**
 * Builds a maps URL to search for the nearest safe shelter when evacuating.
 * Mode-specific query (shelter, evacuation center, storm shelter, etc.).
 * Optional coords center the search on the user for "nearest" results.
 */
export function getEvacuationMapsUrl(
  mode: DisasterMode,
  coords?: Coords | null
): string {
  const query = EVACUATION_MAP_QUERY[mode] ?? 'emergency shelter';
  const encoded = encodeURIComponent(query);

  if (Platform.OS === 'ios') {
    const base = `https://maps.apple.com/?q=${encoded}`;
    if (coords) {
      return `${base}&ll=${coords.latitude},${coords.longitude}`;
    }
    return base;
  }

  // Google Maps (Android / web)
  const base = `https://www.google.com/maps/search/${encoded}`;
  if (coords) {
    return `${base}/@${coords.latitude},${coords.longitude},15z`;
  }
  return base;
}
