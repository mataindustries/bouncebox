export interface Ripple {
  id: string;
  x: number;
  y: number;
  color: string;
  startedAt: number;
  intensity: number;
  kind: 'hit' | 'loop' | 'big';
}

export interface TrailPoint {
  x: number;
  y: number;
  radius: number;
  speed: number;
  age: number;
}

export function getBigHitIntensity(role: string, speed: number): number {
  if (role === 'kick' || role === 'snare' || role === 'portal' || role === 'arp' || role === 'fx') {
    return Math.min(1.8, Math.max(0.9, speed / 7));
  }

  return Math.min(1.2, Math.max(0.45, speed / 10));
}
