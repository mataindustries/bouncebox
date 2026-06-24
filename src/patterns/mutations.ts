import type { DemoPattern, InstrumentRole, NoteName, PadPattern } from '../types';

export interface MutationResult {
  pattern: DemoPattern;
  changed: boolean;
  changedPadIds: string[];
  summary: string;
}

export interface MutationOptions {
  scaleLock?: boolean;
}

export function clonePattern(pattern: DemoPattern): DemoPattern {
  return {
    ...pattern,
    instruments: pattern.instruments.map((instrument) => ({
      ...instrument,
      notes: [...instrument.notes]
    })),
    pads: pattern.pads.map((pad) => ({
      ...pad,
      notes: pad.notes ? [...pad.notes] : undefined
    })),
    seedSteps: pattern.seedSteps.map((step) => ({ ...step })),
    timeSignature: [pattern.timeSignature[0], pattern.timeSignature[1]]
  };
}

export function mutatePattern(pattern: DemoPattern, mutationIndex: number, options: MutationOptions = {}): MutationResult {
  const mutated = clonePattern(pattern);
  mutated.id = `${pattern.id}-mutation-${mutationIndex}`;
  const changedPadIds = new Set<string>();
  const changes: string[] = [];
  const scaleLock = options.scaleLock ?? true;

  if (rotateMelodicPadNotes(mutated, mutationIndex, changedPadIds)) {
    changes.push('notes rotated');
  }

  if (shiftOnePadOctave(mutated, mutationIndex, changedPadIds)) {
    changes.push(mutationIndex % 2 === 0 ? 'octave lift' : 'octave drop');
  }

  if (changeOneRole(mutated, mutationIndex, changedPadIds)) {
    changes.push('role flip');
  }

  if (!scaleLock && chromaticNudgeOnePad(mutated, mutationIndex, changedPadIds)) {
    changes.push('chromatic nudge');
  }

  if (recolorChangedPads(mutated, mutationIndex, changedPadIds)) {
    changes.push('pad glow');
  }

  if (varySeedVelocities(mutated, mutationIndex)) {
    changes.push('accent shift');
  }

  const changed = changes.length > 0;
  if (changed) {
    mutated.name = pattern.name.includes('Mutated') ? pattern.name : `${pattern.name} Mutated`;
  }

  return {
    pattern: mutated,
    changed,
    changedPadIds: [...changedPadIds],
    summary: changed ? `Pattern mutated: ${changes.slice(0, 3).join(' + ')}.` : 'Pattern mutation had no safe targets.'
  };
}

function rotateMelodicPadNotes(pattern: DemoPattern, mutationIndex: number, changedPadIds: Set<string>): boolean {
  const pads = pattern.pads.filter((pad) => !isDrumRole(pad.role) && (pad.notes?.length ?? 0) > 1);

  if (pads.length < 2) {
    return false;
  }

  const firstIndex = mutationIndex % pads.length;
  const secondIndex = (firstIndex + 1) % pads.length;
  const firstNotes = pads[firstIndex].notes ?? [pads[firstIndex].note];
  const secondNotes = pads[secondIndex].notes ?? [pads[secondIndex].note];

  pads[firstIndex].notes = secondNotes;
  pads[firstIndex].note = secondNotes[0];
  pads[firstIndex].label = labelFromPad(pads[firstIndex]);
  pads[secondIndex].notes = firstNotes;
  pads[secondIndex].note = firstNotes[0];
  pads[secondIndex].label = labelFromPad(pads[secondIndex]);
  changedPadIds.add(pads[firstIndex].id);
  changedPadIds.add(pads[secondIndex].id);
  return true;
}

function shiftOnePadOctave(pattern: DemoPattern, mutationIndex: number, changedPadIds: Set<string>): boolean {
  const pads = pattern.pads.filter((pad) => !isDrumRole(pad.role));

  if (pads.length === 0) {
    return false;
  }

  const pad = pads[mutationIndex % pads.length];
  const direction = mutationIndex % 2 === 0 ? 1 : -1;
  const notes = (pad.notes?.length ? pad.notes : [pad.note]).map((note) => shiftOctave(note, direction));

  pad.notes = notes;
  pad.note = notes[0];
  pad.label = labelFromPad(pad);
  changedPadIds.add(pad.id);
  return true;
}

function changeOneRole(pattern: DemoPattern, mutationIndex: number, changedPadIds: Set<string>): boolean {
  const candidates = pattern.pads.filter((pad) => pad.role === 'lead' || pad.role === 'pluck' || pad.role === 'arp' || pad.role === 'fx');

  if (candidates.length === 0) {
    return false;
  }

  const pad = candidates[mutationIndex % candidates.length];
  const nextRole = getNextRole(pad.role);
  pad.role = nextRole;
  pad.kind = nextRole === 'arp' || nextRole === 'fx' ? 'portal' : 'note';
  pad.label = labelFromPad(pad);
  changedPadIds.add(pad.id);

  const instrument = pattern.instruments.find((item) => item.id === pad.instrumentId);
  if (instrument) {
    instrument.role = nextRole;
  }

  return true;
}

function chromaticNudgeOnePad(pattern: DemoPattern, mutationIndex: number, changedPadIds: Set<string>): boolean {
  const candidates = pattern.pads.filter((pad) => !isDrumRole(pad.role));

  if (candidates.length === 0) {
    return false;
  }

  const pad = candidates[(mutationIndex + 1) % candidates.length];
  const direction = mutationIndex % 2 === 0 ? 1 : -1;
  const notes = (pad.notes?.length ? pad.notes : [pad.note]).map((note) => shiftSemitone(note, direction));

  pad.notes = notes;
  pad.note = notes[0];
  pad.label = labelFromPad(pad);
  changedPadIds.add(pad.id);
  return true;
}

function varySeedVelocities(pattern: DemoPattern, mutationIndex: number): boolean {
  if (pattern.seedSteps.length === 0) {
    return false;
  }

  pattern.seedSteps = pattern.seedSteps.map((step, index) => ({
    ...step,
    velocity: clamp(step.velocity + (((index + mutationIndex) % 3) - 1) * 0.06, 0.28, 1)
  }));

  return true;
}

function recolorChangedPads(pattern: DemoPattern, mutationIndex: number, changedPadIds: Set<string>): boolean {
  if (changedPadIds.size === 0) {
    return false;
  }

  const palette = ['#22d3ee', '#f472b6', '#a78bfa', '#34d399', '#facc15', '#fb7185', '#60a5fa'];

  pattern.pads = pattern.pads.map((pad, index) => {
    if (!changedPadIds.has(pad.id)) {
      return pad;
    }

    const color = palette[(mutationIndex + index) % palette.length];
    const instrument = pattern.instruments.find((item) => item.id === pad.instrumentId);
    if (instrument) {
      instrument.color = color;
    }

    return { ...pad, color };
  });

  return true;
}

function getNextRole(role: InstrumentRole): InstrumentRole {
  if (role === 'lead') {
    return 'pluck';
  }

  if (role === 'pluck') {
    return 'lead';
  }

  if (role === 'arp') {
    return 'fx';
  }

  return 'arp';
}

function isDrumRole(role: InstrumentRole): boolean {
  return role === 'kick' || role === 'snare' || role === 'hat' || role === 'hihat';
}

function shiftOctave(note: NoteName, direction: number): NoteName {
  const match = note.match(/^([A-G](?:#|b)?)([1-5])$/);

  if (!match) {
    return note;
  }

  const [, pitch, octaveText] = match;
  const octave = clamp(Number(octaveText) + direction, 1, 5);
  return `${pitch}${octave}` as NoteName;
}

function shiftSemitone(note: NoteName, direction: number): NoteName {
  const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const match = note.match(/^([A-G](?:#|b)?)([1-5])$/);

  if (!match) {
    return note;
  }

  const pitchToIndex: Record<string, number> = {
    C: 0,
    'C#': 1,
    Db: 1,
    D: 2,
    'D#': 3,
    Eb: 3,
    E: 4,
    F: 5,
    'F#': 6,
    Gb: 6,
    G: 7,
    'G#': 8,
    Ab: 8,
    A: 9,
    'A#': 10,
    Bb: 10,
    B: 11
  };
  const [, pitch, octaveText] = match;
  const rawIndex = pitchToIndex[pitch] + direction;
  const octaveShift = rawIndex < 0 ? -1 : rawIndex > 11 ? 1 : 0;
  const nextPitch = chromatic[(rawIndex + 12) % 12];
  const nextOctave = clamp(Number(octaveText) + octaveShift, 1, 5);

  return `${nextPitch}${nextOctave}` as NoteName;
}

function labelFromPad(pad: PadPattern): string {
  if (pad.kind === 'drum') {
    return pad.label;
  }

  if (pad.kind === 'portal' || pad.role === 'arp' || pad.role === 'fx') {
    return 'ARP';
  }

  if (pad.kind === 'chord' || pad.role === 'pad' || pad.role === 'chord') {
    return `${pad.note.replace(/[0-9]/g, '')}*`;
  }

  return pad.note.replace(/[0-9]/g, '').slice(0, 4);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
