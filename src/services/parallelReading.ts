/**
 * Side-by-side reading in two languages.
 *
 * Any two of the seventeen bundled translations can be paired — 136 possible
 * combinations, all working offline. Reading a verse you already know beside
 * one you don't is how people actually pick up a second language, so this is
 * as much a learning tool as a study one.
 *
 * The hard part is versification. Translations do not agree on how verses are
 * divided: Dutch merges the last verse of Exodus 6 into verse 29, Swahili omits
 * John 7:53, several traditions split 3 John 14 into two. Naively pairing verse
 * N with verse N therefore drifts out of alignment partway down a chapter and
 * quietly shows the wrong pairing.
 *
 * Rows here are keyed by verse number, and either side may be null. A gap is
 * rendered as a gap, which is honest, rather than pulled up to fill the space.
 */
import type { LanguageCode } from '@/data/languages';
import { loadChapter, type Chapter } from './bibleReader';

export interface ParallelRow {
  /** Verse number as it appears in whichever translation has it. */
  verse: number;
  /** Null when this translation has no verse with that number. */
  primary: string | null;
  secondary: string | null;
}

export interface ParallelChapter {
  book: string;
  chapter: number;
  primaryLanguage: LanguageCode;
  secondaryLanguage: LanguageCode;
  rows: ParallelRow[];
  /** True when the two translations divide this chapter differently. */
  versificationDiffers: boolean;
  /** Verse numbers present in one side but not the other. */
  unmatched: { primaryOnly: number[]; secondaryOnly: number[] };
  /** Set when a side fell back to English because the text was unavailable. */
  primaryFellBack: boolean;
  secondaryFellBack: boolean;
}

const numbers = (c: Chapter) =>
  Object.keys(c)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

export async function loadParallelChapter(
  book: string,
  chapter: number,
  primaryLanguage: LanguageCode,
  secondaryLanguage: LanguageCode,
): Promise<ParallelChapter> {
  // Both sides load concurrently — they're separate files
  const [a, b] = await Promise.all([
    loadChapter(primaryLanguage, book, chapter),
    loadChapter(secondaryLanguage, book, chapter),
  ]);

  const aNums = numbers(a.chapter);
  const bNums = numbers(b.chapter);
  const aSet = new Set(aNums);
  const bSet = new Set(bNums);

  // Union, so a verse present in either translation gets a row
  const all = [...new Set([...aNums, ...bNums])].sort((x, y) => x - y);

  const rows: ParallelRow[] = all.map((n) => ({
    verse: n,
    primary: a.chapter[String(n)] ?? null,
    secondary: b.chapter[String(n)] ?? null,
  }));

  const primaryOnly = aNums.filter((n) => !bSet.has(n));
  const secondaryOnly = bNums.filter((n) => !aSet.has(n));

  return {
    book,
    chapter,
    primaryLanguage,
    secondaryLanguage,
    rows,
    versificationDiffers: primaryOnly.length > 0 || secondaryOnly.length > 0,
    unmatched: { primaryOnly, secondaryOnly },
    primaryFellBack: a.fellBackToEnglish,
    secondaryFellBack: b.fellBackToEnglish,
  };
}

/**
 * One line explaining a versification difference, for a quiet note above the
 * columns. Returns null when the two agree, which is the usual case.
 */
export function versificationNote(p: ParallelChapter): string | null {
  if (!p.versificationDiffers) return null;
  const { primaryOnly, secondaryOnly } = p.unmatched;
  const parts: string[] = [];
  if (primaryOnly.length) {
    parts.push(`verse${primaryOnly.length > 1 ? 's' : ''} ${primaryOnly.join(', ')} on the left`);
  }
  if (secondaryOnly.length) {
    parts.push(
      `verse${secondaryOnly.length > 1 ? 's' : ''} ${secondaryOnly.join(', ')} on the right`,
    );
  }
  return `These translations divide this chapter differently — ${parts.join(
    ' and ',
  )} has no counterpart. This is normal, not missing text.`;
}

/* -------------------------------------------------------------- preference */

const KEY = 'aihb_parallel';

export interface ParallelPref {
  enabled: boolean;
  secondary: LanguageCode;
  /** Scroll the two columns as one. */
  scrollTogether: boolean;
  /** Follow the spoken verse while audio plays. */
  followAudio: boolean;
}

const DEFAULTS: ParallelPref = {
  enabled: false,
  secondary: 'kjv',
  scrollTogether: true,
  followAudio: true,
};

export function getParallelPref(): ParallelPref {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ParallelPref>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setParallelPref(patch: Partial<ParallelPref>): ParallelPref {
  const next = { ...getParallelPref(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

/**
 * Read both columns aloud, verse by verse, alternating languages.
 *
 * This is the language-learning mode: hear it in the tongue you know, then
 * immediately in the one you are learning. Returns segments for the speech
 * engine, which switches voice per segment.
 */
export function parallelSpeechSegments(
  p: ParallelChapter,
  order: 'primary-first' | 'secondary-first' = 'primary-first',
): Array<{ language: LanguageCode; text: string; verse: number }> {
  const out: Array<{ language: LanguageCode; text: string; verse: number }> = [];
  for (const row of p.rows) {
    const first = order === 'primary-first'
      ? ([p.primaryLanguage, row.primary] as const)
      : ([p.secondaryLanguage, row.secondary] as const);
    const second = order === 'primary-first'
      ? ([p.secondaryLanguage, row.secondary] as const)
      : ([p.primaryLanguage, row.primary] as const);

    if (first[1]) out.push({ language: first[0], text: first[1], verse: row.verse });
    if (second[1]) out.push({ language: second[0], text: second[1], verse: row.verse });
  }
  return out;
}
