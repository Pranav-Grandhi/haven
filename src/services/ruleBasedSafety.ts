/**
 * Rule-based safety analysis from detections (no GPT).
 * Uses disaster-mode logic to mark safe / danger / exit zones.
 * Exit-type zones are pushed into the zones array so they appear
 * as blue "→ EXIT" overlays on the result photo.
 */

import type {
  DisasterMode,
  SafetyAnalysis,
  SafetyZone,
  ZoneType,
  ExitRoute,
  SafetyAction,
  DetectionResult,
} from '../types';

// Danger keywords per mode (more specific first)
const DANGER_LABELS: Record<DisasterMode, string[]> = {
  earthquake: ['hanging', 'bookcase', 'shelf', 'mirror', 'glass', 'window', 'exterior', 'refrigerator', 'electrical panel'],
  flood: ['electrical', 'outlet', 'panel', 'basement', 'floor', 'ground'],
  tornado: ['window', 'exterior', 'garage', 'top floor', 'open room'],
  blast: ['mirror', 'glass', 'window', 'exterior'],
  fire: ['blocked', 'single exit', 'interior room'],
  hazmat: ['vent', 'hvac', 'intake', 'window', 'outlet'],
  hurricane: ['window', 'glass', 'garage', 'exterior', 'door'],
  nuclear: ['window', 'roof', 'exterior', 'vent', 'door'],
  lockdown: ['window', 'hallway', 'open', 'exterior', 'glass'],
  winter: ['exterior', 'window', 'door', 'wet', 'outside'],
};

// Safe / hide-under keywords per mode (more specific first)
const SAFE_LABELS: Record<DisasterMode, string[]> = {
  earthquake: ['door frame', 'doorframe', 'sturdy', 'desk', 'table', 'chair', 'couch', 'sofa', 'bathtub', 'bed', 'wall', 'interior'],
  flood: ['stair', 'staircase', 'stairs', 'roof', 'upper', 'high'],
  tornado: ['basement', 'bathroom', 'bathtub', 'closet', 'hallway', 'interior'],
  blast: ['column', 'behind', 'desk', 'table', 'couch', 'sofa', 'bed', 'interior', 'wall'],
  fire: ['egress', 'exit sign', 'stair', 'staircase', 'door'],
  hazmat: ['seal', 'bathroom', 'interior', 'room', 'closet'],
  hurricane: ['bathroom', 'bathtub', 'closet', 'hallway', 'interior', 'basement'],
  nuclear: ['basement', 'interior', 'concrete', 'wall', 'room'],
  lockdown: ['desk', 'table', 'wall', 'closet', 'interior', 'barricade'],
  winter: ['blanket', 'interior', 'insulation', 'couch', 'sofa', 'bed', 'room'],
};

// Exit-route labels (objects that ARE or indicate an exit)
const EXIT_LABELS = ['door', 'exit', 'stair', 'staircase', 'stairs', 'exit sign', 'escalator'];

// Why each hazard is dangerous
const DANGER_REASONS: Record<DisasterMode, Record<string, string>> = {
  earthquake: {
    window: 'Windows can shatter during shaking. Broken glass causes serious injury. Stay at least 3 feet away.',
    glass: 'Glass may break and fly during an earthquake. Avoid glass doors, panels, and skylights.',
    mirror: 'Mirrors can shatter and create sharp debris. Move away from mirrors and glass surfaces.',
    hanging: 'Hanging lights, plants, or art can fall and hit you. Do not stand under anything that could drop.',
    shelf: 'Unsecured shelves can tip over. Items may fall and cause injury. Keep clear of heavy shelving.',
    bookcase: 'Bookcases and tall furniture can topple in a quake. Stay away from unanchored heavy furniture.',
    exterior: 'Exterior walls and facades can collapse or shed debris. Prefer interior structural zones.',
    refrigerator: 'Heavy appliances can tip and slide. Stay clear of the refrigerator and other tall appliances.',
    'electrical panel': 'Electrical panels can spark if damaged. Do not touch; move away.',
  },
  flood: {
    electrical: 'Water and electricity are deadly. Avoid outlets, panels, and any wiring when flooding is possible.',
    outlet: 'Electrical outlets can electrocute when wet. Do not touch; stay away from flooded areas.',
    panel: 'Electrical panel near water is a serious hazard. Do not touch; evacuate area.',
    basement: 'Basements fill first and can trap you. Move to an upper floor or higher ground immediately.',
    floor: 'Low-lying areas flood first. Seek higher ground or an upper story.',
    ground: 'Ground level is most at risk. Move up if you can do so safely.',
  },
  tornado: {
    window: 'Windows can implode from pressure or flying debris. Stay away; go to an interior room.',
    exterior: 'Exterior rooms and walls are vulnerable to wind and debris. Move to an interior hallway or bathroom.',
    garage: 'Garages often have weak doors and can collapse. Do not shelter in a garage.',
    'top floor': 'Upper floors are more exposed to wind and collapse. Go to the lowest interior level.',
    'open room': 'Open rooms offer no protection from debris. Find a small interior room or closet.',
  },
  blast: {
    window: 'Glass can become projectiles in a blast. Stay away from all windows.',
    glass: 'Glass may shatter and fly at high speed. Avoid glass doors, storefronts, and windows.',
    mirror: 'Mirrors and glass can fragment and cause injury. Move to an interior area.',
    exterior: 'Exterior walls and windows are most exposed. Get to an interior room or behind solid cover.',
  },
  fire: {
    blocked: 'Blocked exits trap you. Keep exits clear and choose a path with more than one way out.',
    'single exit': 'A room with only one exit is dangerous. If that exit is blocked, you cannot escape.',
    'interior room': 'Interior rooms with no windows can trap you in a fire. Prefer rooms near an exit or with a window.',
  },
  hazmat: {
    vent: 'Vents can draw in contaminated air. Seal vents or stay away from HVAC intakes.',
    hvac: 'HVAC systems can spread contaminants. Turn off if safe; avoid intake areas.',
    intake: 'Air intakes can pull in hazardous material. Avoid intake vents and unfiltered outside air.',
    window: 'Windows may not seal tightly. Prefer interior rooms with fewer openings to the outside.',
    outlet: 'Electrical outlets can be an ingress point for contaminated air. Seal if advised.',
  },
  hurricane: {
    window: 'Hurricane winds and debris can shatter windows. Stay away; go to an interior room.',
    glass: 'Glass can become high-speed projectiles in hurricane-force winds. Avoid all glass surfaces.',
    garage: 'Garage doors can blow in under high wind pressure. Do not shelter near or in a garage.',
    exterior: 'Exterior walls face the brunt of wind and debris. Move to an interior room or hallway.',
    door: 'Exterior doors can be blown in. Stay away and brace or barricade exterior doors.',
  },
  nuclear: {
    window: 'Windows offer no radiation protection. Stay away from all exterior windows.',
    roof: 'Roof and upper floors have minimal shielding from fallout. Descend to the basement or a lower floor.',
    exterior: 'Exterior walls and windows reduce shielding. Stay in the center of the building.',
    vent: 'Vents and air intakes can draw in radioactive particles. Seal all vents immediately.',
    door: 'Exterior doors can allow radioactive dust inside. Seal gaps with tape and wet towels.',
  },
  lockdown: {
    window: 'Windows visible from outside expose you. Duck below window sills immediately.',
    hallway: 'Open hallways provide no cover and limit escape options. Find a lockable room.',
    open: 'Open areas leave you exposed with no cover. Find a solid interior room immediately.',
    exterior: 'Exterior walls have windows and entry points. Stay in interior rooms away from exterior walls.',
    glass: 'Glass walls or doors expose your position. Get behind solid cover.',
  },
  winter: {
    exterior: 'Exterior areas expose you to wind chill and frostbite. Stay inside and away from exterior walls.',
    window: 'Windows leak heat rapidly. Keep curtains closed and stay away from drafty windows.',
    door: 'Exterior doors let in cold air. Keep doors closed; place towels at the bottom to stop drafts.',
    wet: 'Wet clothing causes rapid heat loss and hypothermia. Remove and replace wet items immediately.',
    outside: 'Going outside in a winter storm risks frostbite and hypothermia. Stay indoors.',
  },
};

// Why each area is safer
const SAFE_REASONS: Record<DisasterMode, Record<string, string>> = {
  earthquake: {
    desk: 'A sturdy desk provides cover from falling objects. Get under it, hold on, and protect your head and neck.',
    table: 'A solid table can shield you. Get under it and hold a leg if it moves.',
    chair: 'A heavy chair near a sturdy desk can be part of a protective posture. Prefer getting under a desk or table.',
    couch: 'A low, heavy couch can provide cover. Get next to it or behind it and hold on during shaking.',
    sofa: 'A heavy sofa can absorb impacts. Crouch beside or behind it away from windows.',
    bathtub: 'A cast-iron or steel bathtub can shield you from falling debris. Get inside and cover your head.',
    bed: 'A sturdy bed frame can provide some protection. Get under it if no desk or table is nearby.',
    wall: 'Interior load-bearing walls are often more stable. Stay along an interior wall, away from windows.',
    interior: 'Interior areas are safer than exterior walls and windows. Drop, cover, hold on.',
    doorframe: 'A strong door frame offers some protection. Prefer getting under sturdy furniture if possible.',
    'door frame': 'A strong door frame offers some protection. Prefer getting under sturdy furniture if possible.',
    sturdy: 'Sturdy, low furniture is better than tall or unanchored items. Use it for cover.',
  },
  flood: {
    stair: 'Stairs let you move to a higher floor quickly. Do not use elevators; take stairs to upper levels.',
    staircase: 'A staircase is your route to higher ground. Take it now — do not use elevators.',
    stairs: 'Stairs are the safest way up. Move to higher floors immediately.',
    roof: 'In extreme flooding, the roof may be a last resort. Only if instructed and safe to access.',
    upper: 'Upper floors are safer than ground level. Move up as water rises.',
    high: 'High ground or upper stories reduce flood risk. Move up if you can.',
  },
  tornado: {
    basement: 'A basement is one of the safest places in a tornado. Go to the lowest level, away from windows.',
    bathroom: 'Small interior bathrooms often have reinforcing plumbing. Get in and cover yourself.',
    bathtub: 'A bathtub in an interior bathroom offers extra protection. Get in and cover yourself — add a mattress if available.',
    closet: 'An interior closet has fewer windows and less exposure. Get inside and close the door.',
    hallway: 'An interior hallway away from windows can offer protection. Stay low and cover your head.',
    interior: 'Interior rooms and hallways are safer than exterior walls. Stay in the center of the building.',
  },
  blast: {
    interior: 'Interior rooms are better protected from blast and flying debris. Stay inside, away from windows.',
    wall: 'Sturdy interior walls provide some protection. Stay low and away from exterior walls and glass.',
    column: 'Structural columns can offer partial cover. Put solid material between you and the blast.',
    behind: 'Being behind solid cover reduces exposure. Use furniture or walls between you and windows.',
    desk: 'A heavy desk can provide cover from debris. Get under it if you cannot reach a better shelter.',
    table: 'A solid table can offer partial protection. Get under it and hold on.',
    couch: 'A heavy couch or sofa can absorb shrapnel. Crouch behind it away from windows.',
    sofa: 'A heavy sofa provides cover from debris. Get behind or under it, facing away from windows.',
    bed: 'Get between the mattress and bed frame for protection from shrapnel and debris.',
  },
  fire: {
    exit: 'Exits are your primary escape route. Keep the path clear and move quickly.',
    'exit sign': 'Follow the exit sign — it leads to an escape route. Move quickly, stay low.',
    door: 'Close doors behind you as you leave to slow smoke and fire. Use the door to reach an exit.',
    egress: 'Egress routes lead outside. Stay near a clear path to the exit.',
    stair: 'Stairs are the safest way down. Never use elevators in a fire.',
    staircase: 'A staircase is your escape route. Move quickly but stay calm; do not use elevators.',
  },
  hazmat: {
    interior: 'Interior rooms with fewer windows reduce exposure. Stay inside and seal gaps if advised.',
    bathroom: 'Bathrooms often have fewer vents and can be sealed. Use wet towels under the door.',
    seal: 'Sealed rooms reduce outside air. Close windows and doors; seal gaps if instructed.',
    room: 'A small interior room with minimal openings is easier to seal. Stay there until advised.',
    closet: 'An interior closet with no exterior vents can be quickly sealed. Use tape and towels on gaps.',
  },
  hurricane: {
    bathroom: 'Small interior bathrooms have no exterior windows. Get inside and close the door.',
    bathtub: 'A bathtub in an interior bathroom offers extra protection against flying debris. Get in.',
    closet: 'An interior closet has no windows and strong walls. Get inside and close the door.',
    hallway: 'An interior hallway on the lowest floor keeps you away from windows. Stay low.',
    interior: 'Interior rooms without windows are the safest from hurricane winds and debris.',
    basement: 'A basement provides strong protection from hurricane winds. Go to the lowest level.',
  },
  nuclear: {
    basement: 'Basements offer the best radiation shielding — concrete and soil absorb fallout particles.',
    interior: 'Interior rooms away from exterior walls and windows provide better radiation protection.',
    concrete: 'Concrete and brick walls absorb radiation. Stay near the center of solid structures.',
    wall: 'Interior walls provide shielding from radiation. Put as many walls between you and outside as possible.',
    room: 'A sealed interior room slows radioactive dust from entering. Stay put until authorities clear the area.',
  },
  lockdown: {
    desk: 'A heavy desk can provide cover and concealment. Get under or behind it and stay low.',
    table: 'A solid table can shield you. Get underneath and pull chairs around you.',
    wall: 'Solid interior walls provide cover. Stay low against an interior wall away from the door.',
    closet: 'A locked interior closet hides you and provides some cover. Barricade the door.',
    interior: 'Interior rooms with lockable doors are safest. Barricade, silence all devices, stay low.',
    barricade: 'Barricading the door with heavy furniture slows entry. Use desks, cabinets, or bookshelves.',
  },
  winter: {
    blanket: 'Blankets trap body heat. Layer multiple blankets and cover your head.',
    interior: 'Interior rooms away from exterior walls retain heat better. Stay in the center of the building.',
    insulation: 'Insulated areas retain warmth. Use curtains, rugs, and stuffed towels to reduce drafts.',
    couch: 'A couch or sofa can be used as a windbreak and insulation layer. Wrap yourself in cushions.',
    sofa: 'A sofa provides insulation from cold floors. Sit on it and wrap yourself in blankets.',
    bed: 'A bed with multiple layers of blankets is one of the warmest shelter spots. Stay in bed.',
    room: 'A small interior room is easier to keep warm than a large open space. Close all doors.',
  },
};

function labelMatches(detectionLabel: string, keywords: string[]): boolean {
  const lower = detectionLabel.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function bestMatchKeyword(detectionLabel: string, keywords: string[]): string | null {
  const lower = detectionLabel.toLowerCase();
  for (const k of keywords) {
    if (lower.includes(k)) return k;
  }
  return null;
}

function getDangerReason(mode: DisasterMode, matchedKeyword: string): string {
  return DANGER_REASONS[mode][matchedKeyword] ?? `This area is hazardous in ${mode} conditions. Stay away.`;
}

function getSafeReason(mode: DisasterMode, matchedKeyword: string): string {
  return SAFE_REASONS[mode][matchedKeyword] ?? `This area can be relatively safer in ${mode} conditions.`;
}

/** Exit zone description based on the detected object. */
function exitZoneLabel(detectionLabel: string): string {
  if (detectionLabel.includes('stair')) return 'Take stairs to safety';
  if (detectionLabel.includes('exit sign')) return 'Follow exit sign';
  return 'Use as escape route if clear';
}

export function ruleBasedSafety(
  frameId: string,
  mode: DisasterMode,
  detection: DetectionResult
): SafetyAnalysis {
  const zones: SafetyZone[] = [];
  const dangerKeywords = DANGER_LABELS[mode];
  const safeKeywords = SAFE_LABELS[mode];
  const riskDescriptions: string[] = [];
  let safeCount = 0;
  let dangerCount = 0;

  detection.detections.forEach((d, i) => {
    const dangerKeyword = bestMatchKeyword(d.label, dangerKeywords);
    const safeKeyword = bestMatchKeyword(d.label, safeKeywords);
    const isExitObject = labelMatches(d.label, EXIT_LABELS);
    const isDanger = dangerKeyword !== null && d.confidence > 0.3;
    const isSafe = safeKeyword !== null && d.confidence > 0.3 && !isDanger;

    if (isDanger && dangerKeyword) {
      dangerCount++;
      const reason = getDangerReason(mode, dangerKeyword);
      riskDescriptions.push(reason.length > 70 ? `${d.label}: ${reason.slice(0, 70)}…` : `${d.label}: ${reason}`);
      zones.push({
        id: `zone_danger_${i}`,
        type: 'danger',
        priority: 1,
        bbox: d.bbox,
        label: 'DANGER',
        short_description: d.label,
        detailed_reasoning: reason,
        references_detections: [d.id],
        action: 'Stay away',
      });
    } else if (isSafe && safeKeyword) {
      safeCount++;
      const reason = getSafeReason(mode, safeKeyword);
      zones.push({
        id: `zone_safe_${i}`,
        type: 'safe',
        priority: safeCount,
        bbox: d.bbox,
        label: 'SAFE',
        short_description: d.label,
        detailed_reasoning: reason,
        references_detections: [d.id],
        action: 'Move here and take cover',
      });
    } else if (isExitObject && d.confidence > 0.3) {
      // Emit exit zones so they appear as "→ EXIT" overlays on the result photo
      zones.push({
        id: `zone_exit_${i}`,
        type: 'exit' as ZoneType,
        priority: 1,
        bbox: d.bbox,
        label: 'EXIT',
        short_description: d.label,
        detailed_reasoning: exitZoneLabel(d.label),
        references_detections: [d.id],
        action: 'Move toward this exit if route is clear',
      });
    }
  });

  const overall = Math.max(0, 100 - dangerCount * 25 + safeCount * 10);

  const exit_routes: ExitRoute[] = detection.detections
    .filter((d) => labelMatches(d.label, EXIT_LABELS))
    .slice(0, 3)
    .map((d, i) => ({
      id: `exit_${i}`,
      priority: i + 1,
      path_description: d.label.charAt(0).toUpperCase() + d.label.slice(1),
      bbox: d.bbox,
      is_blocked: false,
      notes: exitZoneLabel(d.label),
    }));

  const actions: SafetyAction[] = [];
  const topSafe = zones.filter((z) => z.type === 'safe').sort((a, b) => a.priority - b.priority)[0];
  if (topSafe) {
    actions.push({
      priority: 1,
      instruction: `Move to ${topSafe.short_description} — safest area identified. ${topSafe.action}.`,
      direction: null,
      urgency: 'immediate',
    });
  }
  if (zones.some((z) => z.type === 'danger')) {
    actions.push({
      priority: 2,
      instruction: 'Avoid areas marked in red.',
      direction: null,
      urgency: 'immediate',
    });
  }
  if (exit_routes.length > 0) {
    actions.push({
      priority: 3,
      instruction: `Exit route: ${exit_routes[0].path_description}. ${exit_routes[0].notes ?? ''}`,
      direction: null,
      urgency: 'recommended',
    });
  }
  actions.push({
    priority: 4,
    instruction: `Safety score: ${overall}/100. ${safeCount} safer area${safeCount !== 1 ? 's' : ''}, ${dangerCount} hazard${dangerCount !== 1 ? 's' : ''}.`,
    direction: null,
    urgency: 'recommended',
  });

  const voice_response =
    safeCount > 0 || dangerCount > 0
      ? `Found ${safeCount} safer area${safeCount !== 1 ? 's' : ''} and ${dangerCount} hazard${dangerCount !== 1 ? 's' : ''}. ${actions[0]?.instruction ?? 'Stay alert.'} Safety score: ${overall} out of 100.`
      : `Analysis complete. Safety score: ${overall} out of 100. Stay alert.`;

  return {
    frame_id: frameId,
    mode,
    analysis_timestamp: new Date().toISOString(),
    safety_score: {
      overall,
      structural: overall,
      egress: exit_routes.length > 0 ? 85 : 50,
      hazard_exposure: Math.max(0, 100 - dangerCount * 30),
    },
    zones,
    exit_routes,
    actions,
    voice_response,
    risks_summary: {
      total_count: riskDescriptions.length,
      critical_count: dangerCount,
      descriptions: riskDescriptions.length ? riskDescriptions : ['No high-confidence hazards identified.'],
    },
  };
}
