import type { DemoPattern } from '../types';

export const demoPatterns: DemoPattern[] = [
  {
    id: 'neon-bounce',
    name: 'Neon Bounce',
    tempo: 124,
    key: 'C minor',
    bars: 4,
    timeSignature: [4, 4],
    instruments: [
      { id: 'nb-kick', role: 'kick', label: 'Kick', color: '#22d3ee', notes: ['C2'] },
      { id: 'nb-snare', role: 'snare', label: 'Snare', color: '#f472b6', notes: ['D2'] },
      { id: 'nb-hat', role: 'hihat', label: 'Hat', color: '#facc15', notes: ['G2'] },
      { id: 'nb-bass', role: 'bass', label: 'Bass', color: '#a78bfa', notes: ['C2', 'Eb2', 'G2', 'Bb2'] },
      { id: 'nb-lead', role: 'pluck', label: 'Pluck', color: '#34d399', notes: ['C4', 'Eb4', 'G4', 'Bb4'] },
      { id: 'nb-pad', role: 'pad', label: 'Chord', color: '#38bdf8', notes: ['C3', 'Eb3', 'G3'] },
      { id: 'nb-portal', role: 'portal', label: 'Portal', color: '#fb7185', notes: ['C4', 'Eb4', 'G4', 'Bb4'] }
    ],
    pads: [
      {
        id: 'nb-kick-pad',
        label: 'Kick',
        instrumentId: 'nb-kick',
        role: 'kick',
        kind: 'drum',
        note: 'C2',
        x: 0.2,
        y: 0.78,
        radius: 0.075,
        color: '#22d3ee'
      },
      {
        id: 'nb-snare-pad',
        label: 'Snare',
        instrumentId: 'nb-snare',
        role: 'snare',
        kind: 'drum',
        note: 'D2',
        x: 0.8,
        y: 0.76,
        radius: 0.073,
        color: '#f472b6'
      },
      {
        id: 'nb-hat-pad',
        label: 'Hat',
        instrumentId: 'nb-hat',
        role: 'hihat',
        kind: 'drum',
        note: 'G2',
        x: 0.5,
        y: 0.7,
        radius: 0.061,
        color: '#facc15'
      },
      {
        id: 'nb-bass-pad',
        label: 'Bass',
        instrumentId: 'nb-bass',
        role: 'bass',
        kind: 'bass',
        note: 'C2',
        x: 0.5,
        y: 0.52,
        radius: 0.086,
        color: '#a78bfa'
      },
      {
        id: 'nb-lead-a',
        label: 'Eb',
        instrumentId: 'nb-lead',
        role: 'pluck',
        kind: 'note',
        note: 'Eb4',
        x: 0.23,
        y: 0.32,
        radius: 0.066,
        color: '#34d399'
      },
      {
        id: 'nb-lead-b',
        label: 'G',
        instrumentId: 'nb-lead',
        role: 'pluck',
        kind: 'note',
        note: 'G4',
        x: 0.77,
        y: 0.32,
        radius: 0.066,
        color: '#2dd4bf'
      },
      {
        id: 'nb-chord',
        label: 'Cm',
        instrumentId: 'nb-pad',
        role: 'pad',
        kind: 'chord',
        note: 'C3',
        notes: ['C3', 'Eb3', 'G3'],
        x: 0.5,
        y: 0.2,
        radius: 0.071,
        color: '#38bdf8'
      },
      {
        id: 'nb-portal',
        label: 'ARP',
        instrumentId: 'nb-portal',
        role: 'portal',
        kind: 'portal',
        note: 'C4',
        notes: ['C4', 'Eb4', 'G4', 'Bb4'],
        x: 0.5,
        y: 0.38,
        radius: 0.055,
        color: '#fb7185'
      }
    ],
    seedSteps: [
      { bar: 1, beat: 1, instrumentId: 'nb-kick', note: 'C2', velocity: 0.9 },
      { bar: 1, beat: 2.5, instrumentId: 'nb-snare', note: 'D2', velocity: 0.72 },
      { bar: 1, beat: 3, instrumentId: 'nb-kick', note: 'C2', velocity: 0.66 },
      { bar: 1, beat: 4.5, instrumentId: 'nb-snare', note: 'D2', velocity: 0.74 }
    ]
  },
  {
    id: 'skullstep',
    name: 'Skullstep',
    tempo: 138,
    key: 'C minor',
    bars: 4,
    timeSignature: [4, 4],
    instruments: [
      { id: 'ss-kick', role: 'kick', label: 'Kick', color: '#06b6d4', notes: ['C2'] },
      { id: 'ss-snare', role: 'snare', label: 'Clap', color: '#fb7185', notes: ['D2'] },
      { id: 'ss-hat', role: 'hihat', label: 'Ticks', color: '#f97316', notes: ['A2'] },
      { id: 'ss-bass', role: 'bass', label: 'Wobble', color: '#a855f7', notes: ['C2', 'Bb2', 'G2'] },
      { id: 'ss-lead', role: 'pluck', label: 'Bone Lead', color: '#84cc16', notes: ['C4', 'D4', 'Eb4', 'G4'] },
      { id: 'ss-pad', role: 'pad', label: 'Dark Pad', color: '#60a5fa', notes: ['C3', 'Eb3', 'Bb3'] },
      { id: 'ss-portal', role: 'portal', label: 'Warp', color: '#e879f9', notes: ['G3', 'Bb3', 'C4', 'D4'] }
    ],
    pads: [
      {
        id: 'ss-kick-pad',
        label: 'Kick',
        instrumentId: 'ss-kick',
        role: 'kick',
        kind: 'drum',
        note: 'C2',
        x: 0.18,
        y: 0.75,
        radius: 0.078,
        color: '#06b6d4'
      },
      {
        id: 'ss-snare-pad',
        label: 'Clap',
        instrumentId: 'ss-snare',
        role: 'snare',
        kind: 'drum',
        note: 'D2',
        x: 0.82,
        y: 0.72,
        radius: 0.074,
        color: '#fb7185'
      },
      {
        id: 'ss-hat-pad',
        label: 'Hat',
        instrumentId: 'ss-hat',
        role: 'hihat',
        kind: 'drum',
        note: 'A2',
        x: 0.5,
        y: 0.82,
        radius: 0.056,
        color: '#f97316'
      },
      {
        id: 'ss-bass-a',
        label: 'Wob',
        instrumentId: 'ss-bass',
        role: 'bass',
        kind: 'bass',
        note: 'C2',
        x: 0.36,
        y: 0.52,
        radius: 0.084,
        color: '#a855f7'
      },
      {
        id: 'ss-bass-b',
        label: 'Sub',
        instrumentId: 'ss-bass',
        role: 'bass',
        kind: 'bass',
        note: 'Bb2',
        x: 0.65,
        y: 0.49,
        radius: 0.074,
        color: '#c084fc'
      },
      {
        id: 'ss-lead-a',
        label: 'D',
        instrumentId: 'ss-lead',
        role: 'pluck',
        kind: 'note',
        note: 'D4',
        x: 0.22,
        y: 0.27,
        radius: 0.064,
        color: '#84cc16'
      },
      {
        id: 'ss-chord',
        label: 'Cm7',
        instrumentId: 'ss-pad',
        role: 'pad',
        kind: 'chord',
        note: 'C3',
        notes: ['C3', 'Eb3', 'Bb3'],
        x: 0.78,
        y: 0.26,
        radius: 0.07,
        color: '#60a5fa'
      },
      {
        id: 'ss-portal',
        label: 'WARP',
        instrumentId: 'ss-portal',
        role: 'portal',
        kind: 'portal',
        note: 'G3',
        notes: ['G3', 'Bb3', 'C4', 'D4'],
        x: 0.5,
        y: 0.19,
        radius: 0.058,
        color: '#e879f9'
      }
    ],
    seedSteps: [
      { bar: 1, beat: 1, instrumentId: 'ss-kick', note: 'C2', velocity: 0.95 },
      { bar: 1, beat: 2, instrumentId: 'ss-hat', note: 'A2', velocity: 0.35 },
      { bar: 1, beat: 2.5, instrumentId: 'ss-snare', note: 'D2', velocity: 0.82 },
      { bar: 1, beat: 3.75, instrumentId: 'ss-bass', note: 'Bb2', velocity: 0.75 }
    ]
  },
  {
    id: 'space-marbles',
    name: 'Space Marbles',
    tempo: 112,
    key: 'C minor',
    bars: 4,
    timeSignature: [4, 4],
    instruments: [
      { id: 'sm-kick', role: 'kick', label: 'Pulse', color: '#38bdf8', notes: ['C2'] },
      { id: 'sm-snare', role: 'snare', label: 'Dust', color: '#f472b6', notes: ['D2'] },
      { id: 'sm-hat', role: 'hihat', label: 'Stars', color: '#fde047', notes: ['G2'] },
      { id: 'sm-bass', role: 'bass', label: 'Orbit Bass', color: '#818cf8', notes: ['C2', 'G2', 'Bb2'] },
      { id: 'sm-lead', role: 'pluck', label: 'Glass', color: '#2dd4bf', notes: ['C4', 'Eb4', 'F4', 'G4'] },
      { id: 'sm-pad', role: 'pad', label: 'Nebula', color: '#93c5fd', notes: ['C3', 'G3', 'Bb3'] },
      { id: 'sm-portal', role: 'portal', label: 'Comet', color: '#fb7185', notes: ['C5', 'Bb4', 'G4', 'Eb4'] }
    ],
    pads: [
      {
        id: 'sm-kick-pad',
        label: 'Pulse',
        instrumentId: 'sm-kick',
        role: 'kick',
        kind: 'drum',
        note: 'C2',
        x: 0.21,
        y: 0.8,
        radius: 0.076,
        color: '#38bdf8'
      },
      {
        id: 'sm-snare-pad',
        label: 'Dust',
        instrumentId: 'sm-snare',
        role: 'snare',
        kind: 'drum',
        note: 'D2',
        x: 0.78,
        y: 0.78,
        radius: 0.07,
        color: '#f472b6'
      },
      {
        id: 'sm-hat-pad',
        label: 'Stars',
        instrumentId: 'sm-hat',
        role: 'hihat',
        kind: 'drum',
        note: 'G2',
        x: 0.49,
        y: 0.64,
        radius: 0.058,
        color: '#fde047'
      },
      {
        id: 'sm-bass-pad',
        label: 'Orbit',
        instrumentId: 'sm-bass',
        role: 'bass',
        kind: 'bass',
        note: 'G2',
        x: 0.28,
        y: 0.5,
        radius: 0.078,
        color: '#818cf8'
      },
      {
        id: 'sm-lead-a',
        label: 'Glass',
        instrumentId: 'sm-lead',
        role: 'pluck',
        kind: 'note',
        note: 'F4',
        x: 0.72,
        y: 0.47,
        radius: 0.065,
        color: '#2dd4bf'
      },
      {
        id: 'sm-lead-b',
        label: 'C',
        instrumentId: 'sm-lead',
        role: 'pluck',
        kind: 'note',
        note: 'C4',
        x: 0.2,
        y: 0.25,
        radius: 0.061,
        color: '#34d399'
      },
      {
        id: 'sm-chord',
        label: 'Cloud',
        instrumentId: 'sm-pad',
        role: 'pad',
        kind: 'chord',
        note: 'C3',
        notes: ['C3', 'G3', 'Bb3'],
        x: 0.79,
        y: 0.25,
        radius: 0.074,
        color: '#93c5fd'
      },
      {
        id: 'sm-portal',
        label: 'COMET',
        instrumentId: 'sm-portal',
        role: 'portal',
        kind: 'portal',
        note: 'C5',
        notes: ['C5', 'Bb4', 'G4', 'Eb4'],
        x: 0.5,
        y: 0.16,
        radius: 0.054,
        color: '#fb7185'
      }
    ],
    seedSteps: [
      { bar: 1, beat: 1, instrumentId: 'sm-kick', note: 'C2', velocity: 0.78 },
      { bar: 1, beat: 2.25, instrumentId: 'sm-hat', note: 'G2', velocity: 0.42 },
      { bar: 1, beat: 2.5, instrumentId: 'sm-snare', note: 'D2', velocity: 0.62 },
      { bar: 1, beat: 4, instrumentId: 'sm-lead', note: 'F4', velocity: 0.58 }
    ]
  }
];
