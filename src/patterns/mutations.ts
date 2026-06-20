import type { DemoPattern, InstrumentRole, NoteName, PadPattern } from '../types';

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

export function mutatePattern(pattern: DemoPattern, mutationIndex: number): DemoPattern {
  const mutated = clonePattern(pattern);
  mutated.id = `${pattern.id}-mutation-${mutationIndex}`;
  mutated.name = pattern.name.includes('Mutated') ? pattern.name : `${pattern.name} Mutated`;

  rotateMelodicPadNotes(mutated, mutationIndex);
  shiftOnePadOctave(mutated, mutationIndex);
  changeOneRole(mutated, mutationIndex);
  varySeedVelocities(mutated, mutationIndex);

  return mutated;
}

function rotateMelodicPadNotes(pattern: DemoPattern, mutationIndex: number): void {
  const pads = pattern.pads.filter((pad) => !isDrumRole(pad.role) && (pad.notes?.length ?? 0) > 1);

  if (pads.length < 2) {
    return;
  }

  const firstIndex = mutationIndex % pads.length;
  const secondIndex = (firstIndex + 1) % pads.length;
  const firstNotes = pads[firstIndex].notes ?? [pads[firstIndex].note];
  const secondNotes = pads[secondIndex].notes ?? [pads[secondIndex].note];

  pads[firstIndex].notes = secondNotes;
  pads[firstIndex].note = secondNotes[0];
  pads[secondIndex].notes = firstNotes;
  pads[secondIndex].note = firstNotes[0];
}

function shiftOnePadOctave(pattern: DemoPattern, mutationIndex: number): void {
  const pads = pattern.pads.filter((pad) => !isDrumRole(pad.role));

  if (pads.length === 0) {
    return;
  }

  const pad = pads[mutationIndex % pads.length];
  const direction = mutationIndex % 2 === 0 ? 1 : -1;
  const notes = (pad.notes?.length ? pad.notes : [pad.note]).map((note) => shiftOctave(note, direction));

  pad.notes = notes;
  pad.note = notes[0];
}

function changeOneRole(pattern: DemoPattern, mutationIndex: number): void {
  const candidates = pattern.pads.filter((pad) => pad.role === 'lead' || pad.role === 'pluck' || pad.role === 'arp' || pad.role === 'fx');

  if (candidates.length === 0) {
    return;
  }

  const pad = candidates[mutationIndex % candidates.length];
  const nextRole = getNextRole(pad.role);
  pad.role = nextRole;
  pad.kind = nextRole === 'arp' || nextRole === 'fx' ? 'portal' : 'note';

  const instrument = pattern.instruments.find((item) => item.id === pad.instrumentId);
  if (instrument) {
    instrument.role = nextRole;
  }
}

function varySeedVelocities(pattern: DemoPattern, mutationIndex: number): void {
  pattern.seedSteps = pattern.seedSteps.map((step, index) => ({
    ...step,
    velocity: clamp(step.velocity + (((index + mutationIndex) % 3) - 1) * 0.06, 0.28, 1)
  }));
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
