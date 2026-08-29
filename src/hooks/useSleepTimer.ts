/**
 * Sleep timer for continuous reading.
 *
 * The app is built around the evening watch, so the natural request is "read to
 * me until I fall asleep." This plays consecutive chapters and fades the voice
 * out rather than cutting it off mid-sentence, which is jarring in the dark.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const TIMER_OPTIONS = [10, 20, 30, 45, 60] as const;
export type TimerMinutes = (typeof TIMER_OPTIONS)[number];

interface Options {
  /** Called when the timer expires — stop playback here. */
  onExpire: () => void;
  /** Called each tick with 0–1 volume while fading. */
  onFade?: (volume: number) => void;
  /** Seconds of fade before silence. */
  fadeSeconds?: number;
}

export function useSleepTimer({ onExpire, onFade, fadeSeconds = 30 }: Options) {
  const [minutes, setMinutes] = useState<TimerMinutes | null>(null);
  const [remaining, setRemaining] = useState(0); // seconds
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const expireRef = useRef(onExpire);
  const fadeRef = useRef(onFade);
  useEffect(() => {
    expireRef.current = onExpire;
    fadeRef.current = onFade;
  });

  const clear = useCallback(() => {
    if (tick.current) {
      clearInterval(tick.current);
      tick.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clear();
    setMinutes(null);
    setRemaining(0);
    fadeRef.current?.(1);
  }, [clear]);

  const start = useCallback(
    (mins: TimerMinutes) => {
      clear();
      setMinutes(mins);
      setRemaining(mins * 60);

      tick.current = setInterval(() => {
        setRemaining((prev) => {
          const next = prev - 1;

          if (next <= 0) {
            clear();
            fadeRef.current?.(0);
            expireRef.current();
            setMinutes(null);
            return 0;
          }

          // Ease the volume down over the final stretch
          if (next <= fadeSeconds) {
            fadeRef.current?.(Math.max(0, next / fadeSeconds));
          }
          return next;
        });
      }, 1000);
    },
    [clear, fadeSeconds],
  );

  /** Add time without restarting — for "still awake, keep going". */
  const extend = useCallback((mins: number) => {
    setRemaining((r) => r + mins * 60);
    fadeRef.current?.(1);
  }, []);

  useEffect(() => () => clear(), [clear]);

  const label =
    remaining > 0
      ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
      : null;

  return { minutes, remaining, label, isRunning: remaining > 0, start, cancel, extend };
}
