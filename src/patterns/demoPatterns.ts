import type { DemoPattern } from '../types';

export const demoPatterns: DemoPattern[] = [
  {
    id: 'neon-minor',
    name: 'Neon Minor',
    tempo: 124,
    key: 'C minor',
    pads: [
      { id: 'kick', note: 'C2', x: 0.22, y: 0.76, radius: 0.08, color: '#22d3ee' },
      { id: 'snare', note: 'G2', x: 0.77, y: 0.74, radius: 0.075, color: '#f472b6' },
      { id: 'bass', note: 'C3', x: 0.5, y: 0.58, radius: 0.085, color: '#a78bfa' },
      { id: 'lead-a', note: 'D4', x: 0.24, y: 0.36, radius: 0.07, color: '#34d399' },
      { id: 'lead-b', note: 'G4', x: 0.75, y: 0.34, radius: 0.07, color: '#facc15' },
      { id: 'spark', note: 'C5', x: 0.5, y: 0.2, radius: 0.062, color: '#fb7185' }
    ]
  },
  {
    id: 'future-pentatonic',
    name: 'Future Pentatonic',
    tempo: 108,
    key: 'F pentatonic',
    pads: [
      { id: 'low-f', note: 'F2', x: 0.18, y: 0.68, radius: 0.08, color: '#38bdf8' },
      { id: 'low-c', note: 'C3', x: 0.82, y: 0.68, radius: 0.08, color: '#c084fc' },
      { id: 'mid-g', note: 'G3', x: 0.5, y: 0.52, radius: 0.085, color: '#2dd4bf' },
      { id: 'mid-a', note: 'A3', x: 0.25, y: 0.31, radius: 0.068, color: '#f59e0b' },
      { id: 'high-c', note: 'C4', x: 0.75, y: 0.3, radius: 0.068, color: '#f43f5e' },
      { id: 'high-d', note: 'D4', x: 0.5, y: 0.16, radius: 0.06, color: '#84cc16' }
    ]
  }
];
