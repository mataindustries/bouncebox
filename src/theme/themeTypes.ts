import type { InstrumentRole } from '../types';

export type ThemeId = 'neon-lab' | '808-heritage';

export type CssThemeVars = Record<`--${string}`, string>;

export interface ThemeColorStops {
  start: string;
  mid: string;
  end: string;
}

export interface CanvasRoleTokens {
  accent: string;
  fill: string;
  inner: string;
  text?: string;
}

export interface CanvasTheme {
  background: {
    glow: string;
    glowAlpha: number;
    beatGlow: number;
    effectGlow: number;
    middle: string;
    base: string;
    grid: string;
    gridAlpha: number;
    gridPulse: number;
    gridMinSize: number;
    floor: ThemeColorStops;
    horizon: string;
    horizonAlpha: number;
    vignette: string;
  };
  pads: {
    shape: 'orb' | 'rubber';
    usePatternColors: boolean;
    defaultRole: CanvasRoleTokens;
    roles: Partial<Record<InstrumentRole, CanvasRoleTokens>>;
    glowScale: number;
    inactiveGlow: number;
    activeGlow: number;
    pressedGlow: number;
    inactiveAura: number;
    activeAura: number;
    pressedAura: number;
    portalAura: number;
    stroke: string;
    strokeActive: string;
    edge: string;
    highlight: string;
    label: string;
    subLabel: string;
    labelStroke: string;
    labelFont: string;
  };
  ripples: {
    fallback: string;
    alpha: number;
    bigAlpha: number;
    shadowScale: number;
  };
  particles: {
    shadowBlur: number;
    alpha: number;
  };
  balls: {
    highlight: string;
    mid: string;
    edge: string;
    shadow: string;
    trail: string;
    trailShadow: string;
    trailAlpha: number;
    glowScale: number;
  };
}

export interface BounceBoxTheme {
  id: ThemeId;
  name: string;
  dom: CssThemeVars;
  canvas: CanvasTheme;
}
