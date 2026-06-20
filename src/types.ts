export type NoteName =
  | 'C2'
  | 'D2'
  | 'E2'
  | 'F2'
  | 'G2'
  | 'A2'
  | 'B2'
  | 'C3'
  | 'D3'
  | 'E3'
  | 'F3'
  | 'G3'
  | 'A3'
  | 'B3'
  | 'C4'
  | 'D4'
  | 'E4'
  | 'F4'
  | 'G4'
  | 'A4'
  | 'B4'
  | 'C5';

export interface PadPattern {
  id: string;
  note: NoteName;
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface DemoPattern {
  id: string;
  name: string;
  tempo: number;
  key: string;
  pads: PadPattern[];
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
  activeBalls: number;
  lastTriggeredNote: string;
  audioReady: boolean;
}
