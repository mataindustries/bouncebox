import type { TransportState } from '../types';

const stepsPerBeat = 4;

export class Transport {
  private startedAt = performance.now();
  private lastStep = -1;
  private readonly loopBars = 4;

  constructor(private tempo = 124) {}

  setTempo(tempo: number): void {
    const state = this.getState();
    this.tempo = Math.min(180, Math.max(72, Math.round(tempo)));
    this.startedAt = performance.now() - this.stepToMs(state.step);
    this.lastStep = state.step;
  }

  getTempo(): number {
    return this.tempo;
  }

  get stepsPerLoop(): number {
    return this.loopBars * 4 * stepsPerBeat;
  }

  getStepMs(): number {
    return 60000 / this.tempo / stepsPerBeat;
  }

  getState(now = performance.now()): TransportState {
    const elapsedMs = Math.max(0, now - this.startedAt);
    const totalSteps = Math.floor(elapsedMs / this.getStepMs());
    const step = totalSteps % this.stepsPerLoop;
    const bar = Math.floor(step / 16) + 1;
    const beat = Math.floor((step % 16) / 4) + 1;

    return {
      tempo: this.tempo,
      bar,
      beat,
      step,
      loopBars: this.loopBars,
      isPlaying: true
    };
  }

  consumeAdvancedSteps(now = performance.now()): number[] {
    const state = this.getState(now);

    if (this.lastStep < 0) {
      this.lastStep = state.step;
      return [state.step];
    }

    if (state.step === this.lastStep) {
      return [];
    }

    const steps: number[] = [];
    let next = (this.lastStep + 1) % this.stepsPerLoop;

    while (next !== (state.step + 1) % this.stepsPerLoop) {
      steps.push(next);
      next = (next + 1) % this.stepsPerLoop;
    }

    this.lastStep = state.step;
    return steps;
  }

  getQuantizedStep(now = performance.now()): { step: number; delayMs: number } {
    const elapsedMs = Math.max(0, now - this.startedAt);
    const rawStep = elapsedMs / this.getStepMs();
    const nearestStep = Math.round(rawStep);
    const quantizedElapsedMs = nearestStep * this.getStepMs();
    const delayMs = Math.max(0, Math.min(85, quantizedElapsedMs - elapsedMs));

    return {
      step: ((nearestStep % this.stepsPerLoop) + this.stepsPerLoop) % this.stepsPerLoop,
      delayMs
    };
  }

  private stepToMs(step: number): number {
    return step * this.getStepMs();
  }
}
