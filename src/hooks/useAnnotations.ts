import { useCallback, useEffect, useState } from 'react';

export type HighlightColor = 'gold' | 'purple' | 'blue' | 'green';

const HIGHLIGHTS_KEY = 'bible_highlights';
const NOTES_KEY = 'bible_notes';
const NOTES_META_KEY = 'bible_notes_meta';
const BOOKMARKS_KEY = 'bible_bookmarks';

type HighlightsMap = Record<string, HighlightColor>;
type NotesMap = Record<string, string>;
type NotesMeta = Record<string, { updatedAt: number }>;

const EVENT = 'bible:annotations-changed';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* quota or private mode */
  }
}

export function useAnnotations() {
  const [highlights, setHighlights] = useState<HighlightsMap>(() => read(HIGHLIGHTS_KEY, {}));
  const [notes, setNotes] = useState<NotesMap>(() => read(NOTES_KEY, {}));
  const [notesMeta, setNotesMeta] = useState<NotesMeta>(() => read(NOTES_META_KEY, {}));
  const [bookmarks, setBookmarks] = useState<string[]>(() => read(BOOKMARKS_KEY, []));

  useEffect(() => {
    const sync = () => {
      setHighlights(read(HIGHLIGHTS_KEY, {}));
      setNotes(read(NOTES_KEY, {}));
      setNotesMeta(read(NOTES_META_KEY, {}));
      setBookmarks(read(BOOKMARKS_KEY, []));
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setHighlight = useCallback((key: string, color: HighlightColor | null) => {
    const next = { ...read<HighlightsMap>(HIGHLIGHTS_KEY, {}) };
    if (color) next[key] = color;
    else delete next[key];
    write(HIGHLIGHTS_KEY, next);
  }, []);

  const setNote = useCallback((key: string, text: string) => {
    const nextNotes = { ...read<NotesMap>(NOTES_KEY, {}) };
    const nextMeta = { ...read<NotesMeta>(NOTES_META_KEY, {}) };
    if (text.trim()) {
      nextNotes[key] = text;
      nextMeta[key] = { updatedAt: Date.now() };
    } else {
      delete nextNotes[key];
      delete nextMeta[key];
    }
    write(NOTES_KEY, nextNotes);
    write(NOTES_META_KEY, nextMeta);
  }, []);

  const toggleBookmark = useCallback((key: string) => {
    const current = read<string[]>(BOOKMARKS_KEY, []);
    const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
    write(BOOKMARKS_KEY, next);
  }, []);

  return { highlights, notes, notesMeta, bookmarks, setHighlight, setNote, toggleBookmark };
}

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  gold: '#D4AF37',
  purple: '#a855f7',
  blue: '#3b82f6',
  green: '#10b981',
};
