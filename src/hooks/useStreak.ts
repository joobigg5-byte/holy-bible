import { useState, useEffect, useCallback } from 'react';

const STREAK_KEY = 'aihb_streak';
const LAST_VISIT_KEY = 'aihb_last_visit';
const ENGAGED_KEY = 'aihb_engaged_today';

interface StreakData {
  count: number;
  wasReset: boolean;
}

export function useStreak(): StreakData & { markEngaged: () => void } {
  const [count, setCount] = useState(1);
  const [wasReset, setWasReset] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STREAK_KEY);
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    const now = new Date();
    const today = now.toDateString();

    if (!stored || !lastVisit) {
      localStorage.setItem(STREAK_KEY, '1');
      localStorage.setItem(LAST_VISIT_KEY, today);
      setCount(1);
      return;
    }

    const lastDate = new Date(lastVisit);
    const diffMs = now.getTime() - lastDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (lastDate.toDateString() === today) {
      setCount(parseInt(stored));
      return;
    }

    if (diffHours <= 48) {
      const newCount = parseInt(stored) + 1;
      localStorage.setItem(STREAK_KEY, String(newCount));
      localStorage.setItem(LAST_VISIT_KEY, today);
      localStorage.removeItem(ENGAGED_KEY);
      setCount(newCount);
    } else {
      localStorage.setItem(STREAK_KEY, '1');
      localStorage.setItem(LAST_VISIT_KEY, today);
      localStorage.removeItem(ENGAGED_KEY);
      setCount(1);
      setWasReset(true);
    }
  }, []);

  // Track 60s engagement
  useEffect(() => {
    const engaged = localStorage.getItem(ENGAGED_KEY);
    if (engaged) return;

    const timer = setTimeout(() => {
      localStorage.setItem(ENGAGED_KEY, 'true');
    }, 60000);

    return () => clearTimeout(timer);
  }, []);

  const markEngaged = useCallback(() => {
    localStorage.setItem(ENGAGED_KEY, 'true');
  }, []);

  return { count, wasReset, markEngaged };
}
