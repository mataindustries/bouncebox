import type { NoteName } from '../types';

const noteFrequencies: Record<NoteName, number> = {
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25
};

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

      this.masterGain.gain.value = 0.62;
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.008;
      this.compressor.release.value = 0.16;

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.context.destination);
    }

    if (this.context.state !== 'running') {
      await this.context.resume();
    }

    this.playUnlockTick();
  }

  triggerNote(note: NoteName, intensity = 1): void {
    if (!this.context || !this.masterGain || !this.isReady) {
      return;
    }

    const now = this.context.currentTime;
    const frequency = noteFrequencies[note];
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();

    oscillator.type = frequency < 140 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.996, now + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600 + intensity * 1200, now);
    filter.Q.value = 1.3;

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(0.18 * Math.min(intensity, 1.4), now + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    oscillator.connect(filter);
    filter.connect(amp);
    amp.connect(this.masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.46);
  }

  private playUnlockTick(): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const amp = this.context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    oscillator.connect(amp);
    amp.connect(this.masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.14);
  }
}
