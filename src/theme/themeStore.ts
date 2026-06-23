import { defaultThemeId, getTheme } from './themes';
import type { ThemeId } from './themeTypes';

const storageKey = 'bouncebox-theme';

export function loadStoredThemeId(): ThemeId {
  try {
    return getTheme(window.localStorage.getItem(storageKey)).id;
  } catch {
    return defaultThemeId;
  }
}

export function storeThemeId(themeId: ThemeId): void {
  try {
    window.localStorage.setItem(storageKey, themeId);
  } catch {
    // Private browsing and embedded previews can block storage.
  }
}
