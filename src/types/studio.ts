export type ScreenId = 'deck' | 'instruments' | 'session-log' | 'calibration';

export type ChannelSynthesisType = 'sub-bass' | 'percussion' | 'fm-chime' | 'tape-texture';

export interface MixerChannel {
  id: string;
  number: string;
  name: string;
  sourceLabel: string;
  synthType: ChannelSynthesisType;
  gain: number; // 0 to 100 (mapped to -inf .. +6 dB)
  pan: number; // -100 to +100
  cutoff: number; // 120 to 12000 Hz
  muted: boolean;
  solo: boolean;
  steps: boolean[]; // 16-step sequencer array
  loadedInstrumentId?: string;
}

export interface RecordedTake {
  id: string;
  title: string;
  durationSec: number;
  createdAt: string;
  source: 'microphone' | 'internal-bus';
  url: string;
  sampleRate: number;
}

export type InstrumentCategory =
  | 'All'
  | 'Field Recorders'
  | 'Microphones'
  | 'Synthesizers'
  | 'Sample Packs';

export interface StudioInstrument {
  id: string;
  model: string;
  manufacturer: string;
  category: Exclude<InstrumentCategory, 'All'>;
  summary: string;
  specs: {
    sampleRate: string;
    dynamicRange: string;
    impedance: string;
    architecture: string;
  };
  auditionSynth: ChannelSynthesisType;
  auditionFreq: number;
  schematicType: 'recorder' | 'condenser' | 'synth' | 'tape' | 'ribbon' | 'monitor';
  freqCurve: number[]; // 10 points from 20Hz to 20kHz normalized 0..100
}

export type TakeStatus = 'Master' | 'Approved' | 'Review' | 'Archived';

export interface SessionTakeItem {
  id: string;
  code: string;
  title: string;
  timecode: string;
  duration: string;
  engineer: string;
  status: TakeStatus;
  checked: boolean;
  notes: string;
}

export interface CalibrationSettings {
  sampleRate: '44.1 kHz' | '48 kHz' | '96 kHz';
  bitDepth: '16-bit' | '24-bit' | '32-bit float';
  loudnessTarget: '-14 LUFS' | '-16 LUFS' | '-23 LUFS';
  masterTrimDb: number; // -12 to +6
  headphoneCueMix: number; // 0 to 100
  clickVolume: number; // 0 to 100
  limiterCeilingDb: number; // -6 to 0
  monitoringMode: 'stereo' | 'mono' | 'mid-side';
}
