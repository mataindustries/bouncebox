export type PerformanceEffectId = 'gravity-flip' | 'slow-mo' | 'orbit-chaos';

export interface ActivePerformanceEffect {
  id: PerformanceEffectId;
  label: string;
  endsAt: number;
  durationMs: number;
}

const effectLabels: Record<PerformanceEffectId, string> = {
  'gravity-flip': 'Gravity Flip',
  'slow-mo': 'Slow-Mo',
  'orbit-chaos': 'Orbit Chaos'
};

const effectDurations: Record<PerformanceEffectId, number> = {
  'gravity-flip': 3600,
  'slow-mo': 3200,
  'orbit-chaos': 4200
};

export class PerformanceControls {
  private activeEffect: ActivePerformanceEffect | null = null;

  start(effectId: PerformanceEffectId, now = performance.now()): ActivePerformanceEffect {
    this.activeEffect = {
      id: effectId,
      label: effectLabels[effectId],
      endsAt: now + effectDurations[effectId],
      durationMs: effectDurations[effectId]
    };

    return this.activeEffect;
  }

  update(now = performance.now()): ActivePerformanceEffect | null {
    if (this.activeEffect && now >= this.activeEffect.endsAt) {
      this.activeEffect = null;
    }

    return this.activeEffect;
  }

  clear(): void {
    this.activeEffect = null;
  }

  get active(): ActivePerformanceEffect | null {
    return this.activeEffect;
  }

  getRemainingSeconds(now = performance.now()): number {
    if (!this.activeEffect) {
      return 0;
    }

    return Math.max(0, Math.ceil((this.activeEffect.endsAt - now) / 1000));
  }
}
