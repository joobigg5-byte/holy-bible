import type { Verse } from '@/data/lectionary';

/** Stable key per verse reference, e.g. "John_3_16" or "Lamentations_3_22-23" */
export function verseKey(v: Pick<Verse, 'book' | 'chapter' | 'verseStart' | 'verseEnd'>): string {
  const range = v.verseEnd ? `${v.verseStart}-${v.verseEnd}` : `${v.verseStart}`;
  return `${v.book}_${v.chapter}_${range}`;
}

export function parseVerseKey(key: string): { book: string; chapter: number; verseStart: number; verseEnd?: number } | null {
  const parts = key.split('_');
  if (parts.length < 3) return null;
  const range = parts[parts.length - 1];
  const chapter = Number(parts[parts.length - 2]);
  const book = parts.slice(0, -2).join('_');
  const [start, end] = range.split('-').map(Number);
  if (!book || Number.isNaN(chapter) || Number.isNaN(start)) return null;
  return { book, chapter, verseStart: start, verseEnd: end };
}
