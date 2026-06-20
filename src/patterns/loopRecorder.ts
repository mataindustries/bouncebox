import type { GrooveEvent } from '../types';

export class LoopRecorder {
  private rollingEvents: GrooveEvent[] = [];
  private frozenEvents: GrooveEvent[] = [];
  private frozen = false;

  get isFrozen(): boolean {
    return this.frozen;
  }

  get eventCount(): number {
    return this.frozen ? this.frozenEvents.length : this.rollingEvents.length;
  }

  record(event: GrooveEvent, stepsPerLoop: number): void {
    const normalizedEvent = { ...event, step: event.step % stepsPerLoop };
    this.rollingEvents = this.rollingEvents
      .filter((item) => !(item.step === normalizedEvent.step && item.padId === normalizedEvent.padId))
      .concat(normalizedEvent)
      .slice(-96);
  }

  toggleFreeze(): boolean {
    this.frozen = !this.frozen;

    if (this.frozen) {
      this.frozenEvents = [...this.rollingEvents].sort((a, b) => a.step - b.step);
    }

    return this.frozen;
  }

  clearLoop(): void {
    this.rollingEvents = [];
    this.frozenEvents = [];
    this.frozen = false;
  }

  getEventsForStep(step: number): GrooveEvent[] {
    if (!this.frozen) {
      return [];
    }

    return this.frozenEvents.filter((event) => event.step === step);
  }
}
