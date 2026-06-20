type NoteLetter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type Accidental = '' | '#' | 'b';
type Octave = '1' | '2' | '3' | '4' | '5';

export type NoteName = `${NoteLetter}${Accidental}${Octave}`;
export type ImportedInstrumentRole = 'kick' | 'snare' | 'hat' | 'bass' | 'lead' | 'pluck' | 'pad' | 'chord' | 'arp' | 'fx';
export type InstrumentRole = ImportedInstrumentRole | 'hihat' | 'portal';
export type PadKind = 'drum' | 'bass' | 'note' | 'chord' | 'portal';

export interface PadPattern {
  id: string;
  label: string;
  instrumentId: string;
  role: InstrumentRole;
  kind: PadKind;
  note: NoteName;
  notes?: NoteName[];
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface PatternInstrument {
  id: string;
  role: InstrumentRole;
  label: string;
  color: string;
  notes: NoteName[];
}

export interface PatternStep {
  bar: number;
  beat: number;
  instrumentId: string;
  note: NoteName;
  velocity: number;
}

export interface DemoPattern {
  id: string;
  name: string;
  tempo: number;
  key: string;
  bars: number;
  timeSignature: [number, number];
  instruments: PatternInstrument[];
  pads: PadPattern[];
  seedSteps: PatternStep[];
}

export interface BallSnapshot {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
}

export interface PadSnapshot extends PadPattern {
  isActive: boolean;
}

export interface PhysicsSnapshot {
  balls: BallSnapshot[];
  pads: PadSnapshot[];
}

export interface AppStatus {
  tempo: number;
  key: string;
  patternName: string;
  activeBalls: number;
  lastTriggeredNote: string;
  audioReady: boolean;
  loopEvents: number;
  loopFrozen: boolean;
}

export interface TransportState {
  tempo: number;
  bar: number;
  beat: number;
  step: number;
  loopBars: number;
  isPlaying: boolean;
}

export interface GrooveEvent {
  id: string;
  padId: string;
  instrumentId: string;
  role: InstrumentRole;
  kind: PadKind;
  note: NoteName;
  notes?: NoteName[];
  color: string;
  velocity: number;
  step: number;
  recordedAt: number;
}

export interface ImportedMidiNote {
  time: number;
  note: string;
  length: number;
  velocity: number;
}

export interface ImportedMidiTrack {
  name: string;
  instrument: ImportedInstrumentRole;
  notes: ImportedMidiNote[];
}

export interface ImportedMidiPattern {
  name: string;
  tempo: number;
  key: string;
  swing?: number;
  tracks: ImportedMidiTrack[];
}

export interface ImportedPatternSummary {
  name: string;
  tempo: number;
  key: string;
  trackCount: number;
  instruments: ImportedInstrumentRole[];
  noteCount: number;
}

export type ImportPatternResult =
  | {
      ok: true;
      pattern: DemoPattern;
      source: ImportedMidiPattern;
      summary: ImportedPatternSummary;
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    };
