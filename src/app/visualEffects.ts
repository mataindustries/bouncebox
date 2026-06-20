export interface Ripple {
  id: string;
  x: number;
  y: number;
  color: string;
  startedAt: number;
  intensity: number;
  kind: 'hit' | 'loop' | 'big';
}

export interface HitParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  lifeMs: number;
  startedAt: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  radius: number;
  speed: number;
  age: number;
}

export interface RoleVisual {
  particleCount: number;
  particleSpeed: number;
  ringScale: number;
  accentColor: string;
}

export function getBigHitIntensity(role: string, speed: number): number {
  if (role === 'kick' || role === 'snare' || role === 'portal' || role === 'arp' || role === 'fx') {
    return Math.min(1.8, Math.max(0.9, speed / 7));
  }

  return Math.min(1.2, Math.max(0.45, speed / 10));
}

export function getRoleVisual(role: string): RoleVisual {
  if (role === 'kick') {
    return { particleCount: 7, particleSpeed: 2.4, ringScale: 1.35, accentColor: '#22d3ee' };
  }

  if (role === 'snare') {
    return { particleCount: 8, particleSpeed: 2.8, ringScale: 1.18, accentColor: '#f472b6' };
  }

  if (role === 'hat' || role === 'hihat') {
    return { particleCount: 5, particleSpeed: 3.3, ringScale: 0.88, accentColor: '#facc15' };
  }

  if (role === 'bass') {
    return { particleCount: 4, particleSpeed: 1.4, ringScale: 1.45, accentColor: '#a78bfa' };
  }

  if (role === 'portal' || role === 'arp' || role === 'fx') {
    return { particleCount: 9, particleSpeed: 2.1, ringScale: 1.55, accentColor: '#fb7185' };
  }

  return { particleCount: 6, particleSpeed: 2.2, ringScale: 1.05, accentColor: '#34d399' };
}
