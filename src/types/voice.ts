/**
 * Voice input/output and command types.
 */

export type RecordingState = 'idle' | 'recording' | 'processing';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration_ms: number;
  segments: Array<{
    text: string;
    start_ms: number;
    end_ms: number;
  }>;
}

export type CommandAction =
  | 'set_mode'
  | 'start_scan'
  | 'stop_scan'
  | 'expand_detail'
  | 'get_recommendation'
  | 'generate_report'
  | 'add_context'
  | 'voice_readout'
  | 'unknown';

export interface ParsedCommand {
  action: CommandAction;
  parameters: Record<string, string | number | boolean>;
}

export interface CommandParseResult {
  raw_text: string;
  intent: string;
  command: ParsedCommand;
  confidence: number;
  requires_confirmation: boolean;
}
