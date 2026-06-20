import type { GrooveEvent, InstrumentRole, NoteName, PadKind } from '../types';

const pitchClass: Record<string, number> = {
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

interface TriggerOptions {
  role: InstrumentRole;
  kind: PadKind;
  note: NoteName;
  notes?: NoteName[];
  velocity?: number;
  delayMs?: number;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  get isReady(): boolean {
    return this.context?.state === 'running';
  }

  async start(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.compressor = this.context.createDynamicsCompressor();

      this.masterGain.gain.value = 0.48;
      this.compressor.threshold.value = -20;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 8;
      this.compressor.attack.value = 0.006;
      this.compressor.release.value = 0.18;

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.context.destination);
    }

    if (this.context.state !== 'running') {
      await this.context.resume();
    }

    this.playUnlockTick();
  }

  triggerEvent(event: GrooveEvent, delayMs = 0): void {
    this.triggerInstrument({
      role: event.role,
      kind: event.kind,
      note: event.note,
      notes: event.notes,
      velocity: event.velocity,
      delayMs
    });
  }

  triggerInstrument(options: TriggerOptions): void {
    if (!this.context || !this.masterGain || !this.isReady) {
      return;
    }

    const when = this.context.currentTime + (options.delayMs ?? 0) / 1000;
    const velocity = Math.min(1, Math.max(0.15, options.velocity ?? 0.7));

    if (options.role === 'kick') {
      this.playKick(when, velocity);
      return;
    }

    if (options.role === 'snare') {
      this.playSnare(when, velocity);
      return;
    }

    if (options.role === 'hihat' || options.role === 'hat') {
      this.playHat(when, velocity);
      return;
    }

    if (options.role === 'bass') {
      this.playBass(options.note, when, velocity);
      return;
    }

    if (options.role === 'pad' || options.role === 'chord' || options.kind === 'chord') {
      this.playChord(options.notes ?? [options.note], when, velocity);
      return;
    }

    if (options.role === 'portal' || options.role === 'arp' || options.role === 'fx') {
      this.playArp(options.notes ?? [options.note], when, velocity);
      return;
    }

    this.playPluck(options.note, when, velocity);
  }

  private playKick(when: number, velocity: number): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const amp = this.context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(96, when);
    oscillator.frequency.exponentialRampToValueAtTime(42, when + 0.16);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(0.45 * velocity, when + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);

    oscillator.connect(amp);
    amp.connect(this.masterGain);
    oscillator.start(when);
    oscillator.stop(when + 0.32);
  }

  private playSnare(when: number, velocity: number): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const noise = this.createNoiseBuffer(0.18);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();
    const tone = this.context.createOscillator();
    const toneAmp = this.context.createGain();

    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    filter.Q.value = 0.9;
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(0.22 * velocity, when + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);

    tone.type = 'triangle';
    tone.frequency.value = 185;
    toneAmp.gain.setValueAtTime(0.0001, when);
    toneAmp.gain.exponentialRampToValueAtTime(0.07 * velocity, when + 0.01);
    toneAmp.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.masterGain);
    tone.connect(toneAmp);
    toneAmp.connect(this.masterGain);
    source.start(when);
    tone.start(when);
    tone.stop(when + 0.14);
  }

  private playHat(when: number, velocity: number): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();

    source.buffer = this.createNoiseBuffer(0.08);
    filter.type = 'highpass';
    filter.frequency.value = 5200;
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(0.12 * velocity, when + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.055);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.masterGain);
    source.start(when);
  }

  private playBass(note: NoteName, when: number, velocity: number): void {
    this.playTonal(note, when, velocity, {
      type: 'sawtooth',
      attack: 0.012,
      decay: 0.34,
      gain: 0.16,
      filterStart: 620,
      filterEnd: 180
    });
  }

  private playPluck(note: NoteName, when: number, velocity: number): void {
    this.playTonal(note, when, velocity, {
      type: 'triangle',
      attack: 0.008,
      decay: 0.38,
      gain: 0.13,
      filterStart: 2400,
      filterEnd: 900
    });
  }

  private playChord(notes: NoteName[], when: number, velocity: number): void {
    notes.slice(0, 4).forEach((note, index) => {
      this.playTonal(note, when + index * 0.012, velocity * 0.65, {
        type: 'sine',
        attack: 0.04,
        decay: 0.9,
        gain: 0.075,
        filterStart: 1400,
        filterEnd: 760
      });
    });
  }

  private playArp(notes: NoteName[], when: number, velocity: number): void {
    notes.slice(0, 5).forEach((note, index) => {
      this.playTonal(note, when + index * 0.055, velocity * 0.75, {
        type: 'triangle',
        attack: 0.006,
        decay: 0.18,
        gain: 0.105,
        filterStart: 3100,
        filterEnd: 1500
      });
    });
  }

  private playTonal(
    note: NoteName,
    when: number,
    velocity: number,
    voice: {
      type: OscillatorType;
      attack: number;
      decay: number;
      gain: number;
      filterStart: number;
      filterEnd: number;
    }
  ): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();
    const frequency = this.noteToFrequency(note);

    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(frequency, when);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(voice.filterStart, when);
    filter.frequency.exponentialRampToValueAtTime(voice.filterEnd, when + voice.decay);
    filter.Q.value = 1.1;

    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(voice.gain * velocity, when + voice.attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + voice.decay);

    oscillator.connect(filter);
    filter.connect(amp);
    amp.connect(this.masterGain);
    oscillator.start(when);
    oscillator.stop(when + voice.decay + 0.04);
  }

  private createNoiseBuffer(duration: number): AudioBuffer | null {
    if (!this.context) {
      return null;
    }

    const sampleCount = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, sampleCount, this.context.sampleRate);
    const output = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      output[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    }

    return buffer;
  }

  private noteToFrequency(note: NoteName): number {
    const match = note.match(/^([A-G](?:#|b)?)([1-5])$/);

    if (!match) {
      return 261.63;
    }

    const [, pitch, octaveText] = match;
    const octave = Number(octaveText);
    const midi = 12 * (octave + 1) + pitchClass[pitch];
    return 440 * 2 ** ((midi - 69) / 12);
  }

  private playUnlockTick(): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const now = this.context.currentTime;
    this.playPluck('C4', now, 0.45);
  }
}
