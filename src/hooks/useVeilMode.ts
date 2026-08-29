import { useState, useEffect } from 'react';

const VEIL_KEY = 'aihb_veil_mode';

export function useVeilMode() {
  const [isVeil, setIsVeil] = useState(() => {
    return localStorage.getItem(VEIL_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(VEIL_KEY, String(isVeil));
  }, [isVeil]);

  return { isVeil, toggleVeil: () => setIsVeil(v => !v) };
}
