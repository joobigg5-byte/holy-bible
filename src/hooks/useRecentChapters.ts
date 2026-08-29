/**
 * Track the last N chapters the reader visited.
 */
import { useEffect, useState, useCallback } from 'react';

const KEY = 'bibleReader:recents';
const MAX = 5;

export interface RecentChapter {
  book: string;
  chapter: number;
  at: number;
}

function read(): RecentChapter[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(list: RecentChapter[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); }
  catch { /* noop */ }
}

export function useRecentChapters() {
  const [recents, setRecents] = useState<RecentChapter[]>(() =>
    typeof window === 'undefined' ? [] : read(),
  );

  // Sync across tabs / route changes.
  useEffect(() => {
    const sync = () => setRecents(read());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const push = useCallback((book: string, chapter: number) => {
    const next: RecentChapter[] = [
      { book, chapter, at: Date.now() },
      ...read().filter(r => !(r.book === book && r.chapter === chapter)),
    ].slice(0, MAX);
    write(next);
    setRecents(next);
  }, []);

  return { recents, push };
}
