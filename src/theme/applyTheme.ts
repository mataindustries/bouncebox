import type { BounceBoxTheme } from './themeTypes';

export function applyTheme(theme: BounceBoxTheme, target: HTMLElement = document.documentElement): void {
  target.dataset.theme = theme.id;

  for (const [property, value] of Object.entries(theme.dom)) {
    target.style.setProperty(property, value.trim());
  }
}
