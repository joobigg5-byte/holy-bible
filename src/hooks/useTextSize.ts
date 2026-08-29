/**
 * Reader text size.
 *
 * A daily scripture app is read by a lot of people who need larger type, and
 * there was no way to change it. Persisted, and applied as a CSS variable so
 * any component can opt in with `font-size: var(--reader-scale)`.
 */
import { useCallback, useEffect, useState } from 'react';

const KEY = 'aihb_text_size';

export const TEXT_SIZES = [
  { id: 'sm', label: 'Small', scale: 0.9 },
  { id: 'md', label: 'Medium', scale: 1 },
  { id: 'lg', label: 'Large', scale: 1.18 },
  { id: 'xl', label: 'Larger', scale: 1.38 },
  { id: 'xxl', label: 'Largest', scale: 1.6 },
] as const;

export type TextSizeId = (typeof TEXT_SIZES)[number]['id'];

const DEFAULT: TextSizeId = 'md';

function read(): TextSizeId {
  if (typeof localStorage === 'undefined') return DEFAULT;
  const stored = localStorage.getItem(KEY) as TextSizeId | null;
  return TEXT_SIZES.some((s) => s.id === stored) ? (stored as TextSizeId) : DEFAULT;
}

export function useTextSize() {
  const [size, setSizeState] = useState<TextSizeId>(read);

  useEffect(() => {
    const entry = TEXT_SIZES.find((s) => s.id === size) ?? TEXT_SIZES[1];
    document.documentElement.style.setProperty('--reader-scale', String(entry.scale));
    localStorage.setItem(KEY, size);
  }, [size]);

  const setSize = useCallback((id: TextSizeId) => setSizeState(id), []);

  const step = useCallback((direction: 1 | -1) => {
    setSizeState((current) => {
      const i = TEXT_SIZES.findIndex((s) => s.id === current);
      const next = Math.min(TEXT_SIZES.length - 1, Math.max(0, i + direction));
      return TEXT_SIZES[next].id;
    });
  }, []);

  const scale = (TEXT_SIZES.find((s) => s.id === size) ?? TEXT_SIZES[1]).scale;

  return { size, scale, setSize, step, options: TEXT_SIZES };
}
