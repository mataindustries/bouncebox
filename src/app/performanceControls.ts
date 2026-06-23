export type PerformanceEffectId = 'gravity-flip' | 'turbo' | 'orbit-chaos' | 'echo' | 'stutter' | 'filter-sweep';

export interface ActivePerformanceEffect {
  id: PerformanceEffectId;
  label: string;
  endsAt: number;
  durationMs: number;
}

const effectLabels: Record<PerformanceEffectId, string> = {
  'gravity-flip': 'Gravity Flip',
  turbo: 'Turbo',
  'orbit-chaos': 'Orbit Chaos',
  echo: 'Echo',
  stutter: 'Stutter',
  'filter-sweep': 'Filter Sweep'
};

const effectDurations: Record<PerformanceEffectId, number> = {
  'gravity-flip': 3600,
  turbo: 5200,
  'orbit-chaos': 4200,
  echo: 6400,
  stutter: 2600,
  'filter-sweep': 5600
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
