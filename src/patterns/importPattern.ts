import type {
  DemoPattern,
  ImportedInstrumentRole,
  ImportedMidiNote,
  ImportedMidiPattern,
  ImportedMidiTrack,
  ImportedPatternSummary,
  ImportPatternResult,
  InstrumentRole,
  NoteName,
  PadKind,
  PadPattern,
  PatternInstrument,
  PatternStep
} from '../types';

const supportedInstruments: ImportedInstrumentRole[] = [
  'kick',
  'snare',
  'hat',
  'bass',
  'lead',
  'pluck',
  'pad',
  'chord',
  'arp',
  'fx'
];

const instrumentAliases: Record<string, ImportedInstrumentRole> = {
  hihat: 'hat',
  'hi-hat': 'hat',
  hi_hat: 'hat',
  drums: 'hat',
  synth: 'lead',
  melody: 'lead',
  keys: 'pad',
  chords: 'chord',
  arpeggio: 'arp',
  portal: 'fx'
};

const roleColors: Record<ImportedInstrumentRole, string> = {
  kick: '#22d3ee',
  snare: '#f472b6',
  hat: '#facc15',
  bass: '#a78bfa',
  lead: '#34d399',
  pluck: '#2dd4bf',
  pad: '#93c5fd',
  chord: '#60a5fa',
  arp: '#fb7185',
  fx: '#e879f9'
};

const defaultNotes: Record<ImportedInstrumentRole, NoteName[]> = {
  kick: ['C1'],
  snare: ['D2'],
  hat: ['G2'],
  bass: ['C2', 'Eb2', 'G2'],
  lead: ['C4', 'Eb4', 'G4'],
  pluck: ['C4', 'G4'],
  pad: ['C3', 'Eb3', 'G3'],
  chord: ['C3', 'Eb3', 'G3'],
  arp: ['C4', 'Eb4', 'G4', 'Bb4'],
  fx: ['C5', 'Bb4', 'G4']
};

export const midiLabMiniPrompt =
  'Create a BounceBox MIDI JSON pattern in C minor with drums, bass, lead, and weird playful sound design.';

export const midiLabExampleJson = JSON.stringify(
  {
    name: 'Skullstep Playground',
    tempo: 112,
    key: 'C minor',
    swing: 0.12,
    tracks: [
      {
        name: 'Kick Engine',
        instrument: 'kick',
        notes: [
          { time: 0, note: 'C1', length: 0.25, velocity: 0.95 },
          { time: 1, note: 'C1', length: 0.25, velocity: 0.9 },
          { time: 2.75, note: 'C1', length: 0.25, velocity: 0.78 },
          { time: 4, note: 'C1', length: 0.25, velocity: 0.92 }
        ]
      },
      {
        name: 'Neon Snare',
        instrument: 'snare',
        notes: [
          { time: 1.5, note: 'D2', length: 0.25, velocity: 0.82 },
          { time: 3.5, note: 'D2', length: 0.25, velocity: 0.86 },
          { time: 5.5, note: 'D2', length: 0.25, velocity: 0.8 }
        ]
      },
      {
        name: 'Glass Hats',
        instrument: 'hat',
        notes: [
          { time: 0.5, note: 'G2', length: 0.125, velocity: 0.42 },
          { time: 1.25, note: 'G2', length: 0.125, velocity: 0.36 },
          { time: 2, note: 'G2', length: 0.125, velocity: 0.46 },
          { time: 3.25, note: 'G2', length: 0.125, velocity: 0.38 }
        ]
      },
      {
        name: 'Bass Marbles',
        instrument: 'bass',
        notes: [
          { time: 0, note: 'C2', length: 0.5, velocity: 0.8 },
          { time: 1.5, note: 'Eb2', length: 0.5, velocity: 0.75 },
          { time: 2.5, note: 'G2', length: 0.5, velocity: 0.72 },
          { time: 3.5, note: 'Bb2', length: 0.5, velocity: 0.7 }
        ]
      },
      {
        name: 'Playground Lead',
        instrument: 'lead',
        notes: [
          { time: 0.75, note: 'C4', length: 0.25, velocity: 0.62 },
          { time: 2.25, note: 'Eb4', length: 0.25, velocity: 0.58 },
          { time: 3, note: 'G4', length: 0.25, velocity: 0.64 },
          { time: 6, note: 'Bb4', length: 0.25, velocity: 0.6 }
        ]
      },
      {
        name: 'Warp Toy',
        instrument: 'arp',
        notes: [
          { time: 0, note: 'C5', length: 0.125, velocity: 0.58 },
          { time: 0.25, note: 'Bb4', length: 0.125, velocity: 0.52 },
          { time: 0.5, note: 'G4', length: 0.125, velocity: 0.5 },
          { time: 0.75, note: 'Eb4', length: 0.125, velocity: 0.5 }
        ]
      }
    ]
  },
  null,
  2
);

interface SanitizedTrack extends ImportedMidiTrack {
  id: string;
  color: string;
  notes: Array<ImportedMidiNote & { note: NoteName }>;
}

export function importPatternFromJson(rawJson: string): ImportPatternResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      errors: ['That JSON is not valid yet. Check for missing quotes, commas, or brackets.'],
      warnings
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      errors: ['The root value must be a JSON object with name, tempo, key, and tracks.'],
      warnings
    };
  }

  const name = readRequiredString(parsed, 'name', errors);
  const key = readRequiredString(parsed, 'key', errors);
  const tempo = readRequiredNumber(parsed, 'tempo', errors);
  const tracksValue = parsed.tracks;

  if (!Array.isArray(tracksValue)) {
    errors.push('Missing required field: tracks must be an array.');
  }

  if (errors.length > 0 || tempo === null) {
    return { ok: false, errors, warnings };
  }

  const clampedTempo = clamp(tempo, 72, 180);
  if (clampedTempo !== tempo) {
    warnings.push(`Tempo was clamped from ${tempo} to ${clampedTempo} BPM.`);
  }

  const tracks = sanitizeTracks(tracksValue as unknown[], warnings, errors);

  if (tracks.length === 0) {
    errors.push('Add at least one track with notes before loading.');
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  const swing = readOptionalNumber(parsed.swing, 0, 0.5, warnings, 'swing');
  const pattern = buildDemoPattern({
    name,
    key,
    tempo: clampedTempo,
    swing,
    tracks
  });
  const summary = buildSummary(pattern, tracks);

  return {
    ok: true,
    pattern,
    source: {
      name,
      key,
      tempo: clampedTempo,
      swing,
      tracks
    },
    summary,
    warnings
  };
}

function sanitizeTracks(values: unknown[], warnings: string[], errors: string[]): SanitizedTrack[] {
  return values
    .map((value, index) => sanitizeTrack(value, index, warnings, errors))
    .filter((track): track is SanitizedTrack => Boolean(track))
    .slice(0, 12);
}

function sanitizeTrack(value: unknown, index: number, warnings: string[], errors: string[]): SanitizedTrack | null {
  const label = `Track ${index + 1}`;

  if (!isRecord(value)) {
    errors.push(`${label} must be an object.`);
    return null;
  }

  const name = readRequiredString(value, 'name', errors, label);
  const instrumentValue = readRequiredString(value, 'instrument', errors, label);
  const notesValue = value.notes;

  if (!Array.isArray(notesValue)) {
    errors.push(`${label} is missing notes as an array.`);
  }

  if (!name || !instrumentValue || !Array.isArray(notesValue)) {
    return null;
  }

  const instrument = normalizeInstrument(instrumentValue);
  if (!instrument) {
    errors.push(`${label} uses unsupported instrument "${instrumentValue}". Use ${supportedInstruments.join(', ')}.`);
    return null;
  }

  const notes = notesValue
    .map((noteValue, noteIndex) => sanitizeNote(noteValue, `${label} note ${noteIndex + 1}`, warnings, errors))
    .filter((note): note is ImportedMidiNote & { note: NoteName } => Boolean(note));

  if (notes.length === 0) {
    warnings.push(`${label} had no playable notes, so BounceBox will use a safe ${instrument} default.`);
    notes.push(
      ...defaultNotes[instrument].map((note, noteIndex) => ({
        time: noteIndex,
        note,
        length: 0.25,
        velocity: 0.7
      }))
    );
  }

  return {
    id: slugify(`${index + 1}-${name}`),
    name,
    instrument,
    color: roleColors[instrument],
    notes
  };
}

function sanitizeNote(
  value: unknown,
  label: string,
  warnings: string[],
  errors: string[]
): (ImportedMidiNote & { note: NoteName }) | null {
  if (!isRecord(value)) {
    errors.push(`${label} must be an object.`);
    return null;
  }

  const time = readRequiredNumber(value, 'time', errors, label);
  const noteValue = readRequiredString(value, 'note', errors, label);
  const length = readRequiredNumber(value, 'length', errors, label);
  const velocity = readRequiredNumber(value, 'velocity', errors, label);

  if (time === null || !noteValue || length === null || velocity === null) {
    return null;
  }

  const note = normalizeNote(noteValue, warnings, label);
  if (!note) {
    errors.push(`${label} has unsupported note "${noteValue}". Use notes like C1, Eb2, G4, or Bb4.`);
    return null;
  }

  const safeTime = clamp(time, 0, 15.75);
  const safeLength = clamp(length, 0.0625, 4);
  const safeVelocity = clamp(velocity, 0.05, 1);

  if (safeTime !== time) {
    warnings.push(`${label} time was clamped into the 4-bar loop.`);
  }

  if (safeLength !== length) {
    warnings.push(`${label} length was clamped to a safe range.`);
  }

  if (safeVelocity !== velocity) {
    warnings.push(`${label} velocity was clamped between 0.05 and 1.`);
  }

  return {
    time: safeTime,
    note,
    length: safeLength,
    velocity: safeVelocity
  };
}

function buildDemoPattern(input: {
  name: string;
  key: string;
  tempo: number;
  swing: number;
  tracks: SanitizedTrack[];
}): DemoPattern {
  const instruments: PatternInstrument[] = input.tracks.map((track) => ({
    id: track.id,
    role: track.instrument,
    label: track.name,
    color: track.color,
    notes: buildPlayableNotes(track)
  }));
  const pads: PadPattern[] = input.tracks.map((track, index) => {
    const notes = buildPlayableNotes(track);
    const position = getPadPosition(index, input.tracks.length, track.instrument);

    return {
      id: `${track.id}-pad`,
      label: compactLabel(track.name),
      instrumentId: track.id,
      role: track.instrument,
      kind: roleToPadKind(track.instrument),
      note: notes[0],
      notes,
      x: position.x,
      y: position.y,
      radius: position.radius,
      color: track.color
    };
  });

  return {
    id: `imported-${slugify(input.name)}`,
    name: input.name,
    tempo: input.tempo,
    key: input.key,
    bars: 4,
    timeSignature: [4, 4],
    instruments,
    pads,
    seedSteps: buildSeedSteps(input.tracks)
  };
}

function buildPlayableNotes(track: SanitizedTrack): NoteName[] {
  const uniqueNotes = Array.from(new Set(track.notes.map((note) => note.note)));
  const representativeNotes = chooseRepresentativeNotes(uniqueNotes.length > 0 ? uniqueNotes : defaultNotes[track.instrument], 5);

  if (isDrum(track.instrument)) {
    return representativeNotes.slice(0, 1);
  }

  if (representativeNotes.length >= 2) {
    return representativeNotes;
  }

  return Array.from(new Set([...representativeNotes, ...createOctaveVariations(representativeNotes[0])])).slice(0, 4);
}

function chooseRepresentativeNotes(notes: NoteName[], limit: number): NoteName[] {
  if (notes.length <= limit) {
    return notes;
  }

  return Array.from({ length: limit }, (_, index) => notes[Math.floor((index / limit) * notes.length)]);
}

function createOctaveVariations(note: NoteName): NoteName[] {
  const match = note.match(/^([A-G](?:#|b)?)([1-5])$/);
  if (!match) {
    return [note];
  }

  const [, pitch, octaveText] = match;
  const octave = Number(octaveText);
  const variations = [note];

  if (octave < 5) {
    variations.push(`${pitch}${octave + 1}` as NoteName);
  }

  if (octave > 1) {
    variations.push(`${pitch}${octave - 1}` as NoteName);
  }

  return variations;
}

function buildSeedSteps(tracks: SanitizedTrack[]): PatternStep[] {
  return tracks.flatMap((track) =>
    track.notes.slice(0, 48).map((note) => ({
      bar: Math.floor(note.time / 4) + 1,
      beat: (note.time % 4) + 1,
      instrumentId: track.id,
      note: note.note,
      velocity: note.velocity
    }))
  );
}

function buildSummary(pattern: DemoPattern, tracks: SanitizedTrack[]): ImportedPatternSummary {
  return {
    name: pattern.name,
    tempo: pattern.tempo,
    key: pattern.key,
    trackCount: tracks.length,
    instruments: Array.from(new Set(tracks.map((track) => track.instrument))),
    noteCount: tracks.reduce((total, track) => total + track.notes.length, 0)
  };
}

function getPadPosition(index: number, total: number, role: ImportedInstrumentRole): { x: number; y: number; radius: number } {
  const bottomRoles = new Set<ImportedInstrumentRole>(['kick', 'snare', 'hat']);
  const topRoles = new Set<ImportedInstrumentRole>(['lead', 'pluck', 'pad', 'chord', 'arp', 'fx']);
  const angle = -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2;
  const orbit = total > 8 ? 0.32 : 0.28;
  let x = 0.5 + Math.cos(angle) * orbit;
  let y = 0.49 + Math.sin(angle) * orbit;

  if (bottomRoles.has(role)) {
    y = Math.max(y, 0.68);
  }

  if (role === 'bass') {
    y = clamp(y, 0.42, 0.62);
  }

  if (topRoles.has(role)) {
    y = Math.min(y, 0.42);
  }

  x = clamp(x, 0.18, 0.82);
  y = clamp(y, 0.16, 0.82);

  return {
    x,
    y,
    radius: role === 'fx' || role === 'arp' ? 0.058 : role === 'bass' ? 0.078 : 0.068
  };
}

function roleToPadKind(role: ImportedInstrumentRole): PadKind {
  if (isDrum(role)) {
    return 'drum';
  }

  if (role === 'bass') {
    return 'bass';
  }

  if (role === 'pad' || role === 'chord') {
    return 'chord';
  }

  if (role === 'arp' || role === 'fx') {
    return 'portal';
  }

  return 'note';
}

function isDrum(role: InstrumentRole): boolean {
  return role === 'kick' || role === 'snare' || role === 'hat' || role === 'hihat';
}

function normalizeInstrument(value: string): ImportedInstrumentRole | null {
  const cleaned = value.trim().toLowerCase();
  const aliased = instrumentAliases[cleaned] ?? cleaned;
  return supportedInstruments.includes(aliased as ImportedInstrumentRole) ? (aliased as ImportedInstrumentRole) : null;
}

function normalizeNote(value: string, warnings: string[], label: string): NoteName | null {
  const match = value.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);

  if (!match) {
    return null;
  }

  const [, letter, accidental, octaveText] = match;
  const octave = Number(octaveText);
  const safeOctave = clamp(octave, 1, 5);

  if (safeOctave !== octave) {
    warnings.push(`${label} octave was clamped from ${octave} to ${safeOctave}.`);
  }

  return `${letter.toUpperCase()}${accidental}${safeOctave}` as NoteName;
}

function readRequiredString(record: Record<string, unknown>, field: string, errors: string[], owner?: string): string {
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${owner ? `${owner} is missing` : 'Missing required field:'} ${field}.`);
    return '';
  }

  return value.trim().slice(0, 72);
}

function readRequiredNumber(record: Record<string, unknown>, field: string, errors: string[], owner?: string): number | null {
  const value = record[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${owner ? `${owner} is missing` : 'Missing required field:'} ${field} as a number.`);
    return null;
  }

  return value;
}

function readOptionalNumber(value: unknown, min: number, max: number, warnings: string[], label: string): number {
  if (value === undefined) {
    return 0;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    warnings.push(`${label} was ignored because it is not a number.`);
    return 0;
  }

  const safeValue = clamp(value, min, max);
  if (safeValue !== value) {
    warnings.push(`${label} was clamped to ${safeValue}.`);
  }

  return safeValue;
}

function compactLabel(value: string): string {
  const words = value.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((word) => word[0]).join('') : value).slice(0, 8).toUpperCase();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
