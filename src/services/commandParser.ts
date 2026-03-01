import type {
  CommandAction,
  CommandParseResult,
  ParsedCommand,
} from '../types';
import type { DisasterMode } from '../types';

const MODE_KEYWORDS: Record<DisasterMode, string[]> = {
  earthquake: ['earthquake', 'quake', 'seismic'],
  flood: ['flood', 'flooding', 'water'],
  tornado: ['tornado', 'twister', 'cyclone'],
  blast: ['blast', 'explosion', 'bomb'],
  fire: ['fire', 'burning', 'smoke'],
  hazmat: ['hazmat', 'chemical', 'gas', 'radiation'],
};

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

function matchMode(text: string): DisasterMode | null {
  const n = normalize(text);
  for (const [mode, keywords] of Object.entries(MODE_KEYWORDS)) {
    if (keywords.some((k) => n.includes(k))) return mode as DisasterMode;
  }
  return null;
}

/**
 * Parse transcribed text into app commands.
 */
export function parseCommand(
  rawText: string,
  _currentState?: { mode: DisasterMode | null; is_scanning: boolean }
): CommandParseResult {
  const text = normalize(rawText);
  if (!text) {
    return {
      raw_text: rawText,
      intent: 'unknown',
      command: { action: 'unknown', parameters: {} },
      confidence: 0,
      requires_confirmation: false,
    };
  }

  // Mode selection
  const mode = matchMode(text);
  if (mode) {
    const cmd: ParsedCommand = { action: 'set_mode', parameters: { mode } };
    return {
      raw_text: rawText,
      intent: 'set_mode',
      command: cmd,
      confidence: 0.9,
      requires_confirmation: false,
    };
  }

  // Start scan
  if (/\b(scan|analyze|check this room)\b/.test(text)) {
    return {
      raw_text: rawText,
      intent: 'start_scan',
      command: { action: 'start_scan', parameters: {} },
      confidence: 0.9,
      requires_confirmation: false,
    };
  }

  // Stop scan
  if (/\b(stop|pause|cancel)\b/.test(text)) {
    return {
      raw_text: rawText,
      intent: 'stop_scan',
      command: { action: 'stop_scan', parameters: {} },
      confidence: 0.9,
      requires_confirmation: false,
    };
  }

  // Get details
  if (/\b(tell me more|why is that dangerous|explain)\b/.test(text)) {
    return {
      raw_text: rawText,
      intent: 'expand_detail',
      command: { action: 'expand_detail', parameters: { target: 'last_zone' } },
      confidence: 0.85,
      requires_confirmation: false,
    };
  }

  // Navigation / recommendation
  if (/\b(where should I go|nearest exit|safest spot)\b/.test(text)) {
    return {
      raw_text: rawText,
      intent: 'get_recommendation',
      command: { action: 'get_recommendation', parameters: {} },
      confidence: 0.85,
      requires_confirmation: false,
    };
  }

  // Report
  if (/\b(generate report|save this|export)\b/.test(text)) {
    return {
      raw_text: rawText,
      intent: 'generate_report',
      command: { action: 'generate_report', parameters: {} },
      confidence: 0.85,
      requires_confirmation: false,
    };
  }

  // Voice readout
  if (/\b(read it out|tell me|speak)\b/.test(text)) {
    return {
      raw_text: rawText,
      intent: 'voice_readout',
      command: { action: 'voice_readout', parameters: {} },
      confidence: 0.85,
      requires_confirmation: false,
    };
  }

  // Context input (e.g. "fire is behind me")
  const contextMatch = text.match(
    /(?:the )?(fire|explosion|threat|danger|flood)\s+(?:is )?(behind|ahead|left|right|in front of)/i
  );
  if (contextMatch) {
    const direction = contextMatch[2].toLowerCase();
    return {
      raw_text: rawText,
      intent: 'add_context',
      command: {
        action: 'add_context',
        parameters: { context: 'threat_direction', value: direction },
      },
      confidence: 0.8,
      requires_confirmation: false,
    };
  }

  return {
    raw_text: rawText,
    intent: 'unknown',
    command: { action: 'unknown', parameters: {} },
    confidence: 0,
    requires_confirmation: false,
  };
}
