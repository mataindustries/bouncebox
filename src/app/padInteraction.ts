import type { PadSnapshot } from '../types';

interface PadInteractionOptions {
  canvas: HTMLCanvasElement;
  getPads: () => PadSnapshot[];
  onDragStart: (padId: string) => void;
  onDragMove: (padId: string, x: number, y: number) => void;
  onDragEnd: () => void;
}

export class PadInteraction {
  private activePadId: string | null = null;
  private pointerId: number | null = null;

  constructor(private readonly options: PadInteractionOptions) {
    this.options.canvas.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
    this.options.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
    this.options.canvas.addEventListener('pointerup', () => this.handlePointerUp());
    this.options.canvas.addEventListener('pointercancel', () => this.handlePointerUp());
    this.options.canvas.addEventListener('lostpointercapture', () => this.handlePointerUp());
  }

  private handlePointerDown(event: PointerEvent): void {
    const point = this.toCanvasPoint(event);
    const hitPad = this.findPadAt(point.x, point.y);

    if (!hitPad) {
      return;
    }

    event.preventDefault();
    this.activePadId = hitPad.id;
    this.pointerId = event.pointerId;
    this.options.canvas.setPointerCapture(event.pointerId);
    this.options.onDragStart(hitPad.id);
    this.options.onDragMove(hitPad.id, point.x, point.y);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.activePadId || this.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const point = this.toCanvasPoint(event);
    this.options.onDragMove(this.activePadId, point.x, point.y);
  }

  private handlePointerUp(): void {
    if (!this.activePadId) {
      return;
    }

    this.activePadId = null;
    this.pointerId = null;
    this.options.onDragEnd();
  }

  private findPadAt(x: number, y: number): PadSnapshot | null {
    const pads = [...this.options.getPads()].reverse();

    for (const pad of pads) {
      const distance = Math.hypot(x - pad.x, y - pad.y);

      if (distance <= pad.radius * 1.35) {
        return pad;
      }
    }

    return null;
  }

  private toCanvasPoint(event: PointerEvent): { x: number; y: number } {
    const rect = this.options.canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
}
