/**
 * Colour theme.
 *
 * Themes are pure CSS variable overrides on <html data-theme="…">, so nothing
 * in any component needs to know which one is active. Sanctuary is the original
 * gold on black and stays the default.
 */
import { useCallback, useEffect, useState } from 'react';

const KEY = 'aihb_theme';

export const THEMES = [
  {
    id: 'sanctuary',
    name: 'Sanctuary',
    note: 'Gold on black, as it was',
    swatch: ['#000000', '#caa444', '#ffd800'],
    meta: '#000000',
  },
  {
    id: 'ember',
    name: 'Ember',
    note: 'Warm firelight, softer at night',
    swatch: ['#0d0908', '#d08c4a', '#f5a83d'],
    meta: '#0d0908',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    note: 'Cool and quiet',
    swatch: ['#0b0e15', '#a3b4c7', '#8fd0f0'],
    meta: '#0b0e15',
  },
  {
    id: 'parchment',
    name: 'Parchment',
    note: 'For reading in daylight',
    swatch: ['#f0e9db', '#4a3620', '#7a3f14'],
    meta: '#f0e9db',
  },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

const DEFAULT: ThemeId = 'sanctuary';

function read(): ThemeId {
  if (typeof localStorage === 'undefined') return DEFAULT;
  const stored = localStorage.getItem(KEY) as ThemeId | null;
  return THEMES.some((t) => t.id === stored) ? (stored as ThemeId) : DEFAULT;
}

/** Apply before React paints, so there is no flash of the wrong theme. */
export function applyStoredTheme() {
  if (typeof document === 'undefined') return;
  const id = read();
  if (id === DEFAULT) document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', id);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(read);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === DEFAULT) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);

    // Keep the browser chrome in step, or the status bar clashes on mobile
    const entry = THEMES.find((t) => t.id === theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && entry) meta.setAttribute('content', entry.meta);
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => setThemeState(id), []);

  return { theme, setTheme, themes: THEMES };
}
