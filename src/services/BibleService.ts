/**
 * Offline-first Bible service.
 *
 * Load order for any verse lookup:
 *   1. localStorage cache (instant)
 *   2. /public/bibles/{folder}/{book}.json (offline-bundled)
 *   3. https://query.getbible.net/v2 (online fallback, English-adjacent only)
 *
 * FIXED:
 *   - FOLDERS was missing it, de, ja, chi, hin, rus and had 'arabic_svd'
 *     where the folder on disk is 'arabic'. Six languages with complete
 *     bundled text were never being read.
 *   - The parser only understood the nested {name, chapters:{...}} shape used
 *     by the old en_kjv files. Every other folder ships the flat
 *     {chapter:{verse:"text"}} shape, so all of them silently returned null.
 *     Both shapes are now handled.
 */

import { LANGUAGES, type LanguageCode } from '@/data/languages';

export type TranslationCode = LanguageCode;
export type VerseSource = 'cache' | 'offline' | 'live' | 'missing';

export interface FetchedVerse {
  text: string;
  reference: string;
  translation: TranslationCode;
  source: VerseSource;
}

/** Flat shape: { "1": { "1": "In the beginning..." } } */
type FlatBook = Record<string, Record<string, string>>;
/** Legacy nested shape kept for backwards compatibility. */
interface NestedBook {
  name?: string;
  chapters: Record<string, Record<string, { text: string; end?: number }>>;
}
type Chapter = Record<string, { text: string; end?: number }>;

/**
 * Internal translation -> /public/bibles/ folder name.
 * Must stay in sync with LOCAL_BIBLE_FOLDERS in bibleReader.ts.
 */
const FOLDERS: Record<TranslationCode, string> = {
  kjv: 'en_kjv',
  twi: 'twi_akuapem',
  yor: 'yoruba',
  swa: 'swahili',
  rv1960: 'spanish_rv1960',
  jfa: 'portuguese_jfa',
  lsg: 'french_lsg',
  it: 'italian',
  de: 'german',
  ja: 'japanese',
  chi: 'chinese_cuv',
  hin: 'hindi',
  rus: 'russian_synodal',
  zul: 'zulu',
  svd: 'arabic',
  nld: 'dutch',
  kor: 'korean',
};

/** Translation -> GetBible online slug. Missing entry => no online fallback. */
const GETBIBLE_SLUG: Partial<Record<TranslationCode, string>> = {
  kjv: 'kjv',
  rv1960: 'valera',
  jfa: 'almeida',
  lsg: 'ls1910',
  it: 'riveduta',
  de: 'luther1912',
  rus: 'synodal',
  chi: 'cus',
  svd: 'arabicsv',
};

const BOOK_NAMES = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah',
  'Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
  '2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation',
];
const GETBIBLE_BOOKS: Record<string, string> = Object.fromEntries(
  BOOK_NAMES.map((b) => [b, b]),
);

const slug = (book: string) => book.toLowerCase().replace(/\s+/g, '_');
const cacheKey = (t: TranslationCode, b: string, c: number, v: number, ve?: number) =>
  `bible:${t}:${slug(b)}:${c}:${v}${ve ? '-' + ve : ''}`;
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// Same footnote handling as bibleReader — see the note there.
const cleanText = (s: string) =>
  s
    .replace(/\\+[fx]\s[\s\S]*?\\+[fx]\*/g, '')
    .replace(/\\+[a-zA-Z]+\*?/g, ' ')
    .replace(/\\/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

function cacheGet(key: string): FetchedVerse | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return { ...(JSON.parse(raw) as FetchedVerse), source: 'cache' };
  } catch {
    return null;
  }
}

function cacheSet(key: string, value: Omit<FetchedVerse, 'source'>) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
}

/** Accept either on-disk shape and return a uniform chapter map. */
function normaliseBook(raw: unknown): Record<string, Chapter> | null {
  if (!raw || typeof raw !== 'object') return null;

  const nested = raw as NestedBook;
  if (nested.chapters && typeof nested.chapters === 'object') {
    return nested.chapters;
  }

  const flat = raw as FlatBook;
  const out: Record<string, Chapter> = {};
  for (const [ch, verses] of Object.entries(flat)) {
    if (!/^\d+$/.test(ch) || typeof verses !== 'object' || verses === null) continue;
    const chapter: Chapter = {};
    for (const [v, text] of Object.entries(verses)) {
      if (typeof text === 'string') chapter[v] = { text: cleanText(stripHtml(text)) };
    }
    out[ch] = chapter;
  }
  return Object.keys(out).length ? out : null;
}

class BibleServiceImpl {
  private translation: TranslationCode = 'kjv';
  private bookCache = new Map<string, Record<string, Chapter> | null>();

  setTranslation(translation: TranslationCode) {
    if (LANGUAGES.find((l) => l.code === translation)) this.translation = translation;
  }

  getTranslation(): TranslationCode {
    return this.translation;
  }

  async getVerse(
    book: string,
    chapter: number,
    verse: number,
    verseEnd?: number,
    translation: TranslationCode = this.translation,
  ): Promise<FetchedVerse> {
    const key = cacheKey(translation, book, chapter, verse, verseEnd);
    const cached = cacheGet(key);
    if (cached) return cached;

    const fromFile = await this.loadFromFile(translation, book, chapter, verse, verseEnd);
    if (fromFile) {
      cacheSet(key, { text: fromFile.text, reference: fromFile.reference, translation });
      return fromFile;
    }

    const online = await this.loadFromGetBible(translation, book, chapter, verse, verseEnd);
    if (online) {
      cacheSet(key, { text: online.text, reference: online.reference, translation });
      return online;
    }

    return {
      text: '',
      reference: this.formatRef(book, chapter, verse, verseEnd),
      translation,
      source: 'missing',
    };
  }

  async getChapter(book: string, chapter: number, translation: TranslationCode = this.translation) {
    const chapters = await this.loadBookFile(translation, book);
    return chapters?.[String(chapter)] ?? {};
  }

  async preloadCommonBooks() {
    const targets: Array<[string, number, number, number?]> = [
      ['Genesis', 1, 1],
      ['Psalms', 23, 1, 6],
      ['John', 3, 16],
      ['Matthew', 11, 28],
    ];
    await Promise.all(
      targets.map(([b, c, v, ve]) => this.getVerse(b, c, v, ve).catch(() => undefined)),
    );
  }

  // --- internals -----------------------------------------------------------

  private async loadBookFile(
    translation: TranslationCode,
    book: string,
  ): Promise<Record<string, Chapter> | null> {
    const folder = FOLDERS[translation];
    if (!folder) return null;
    const cacheId = `${folder}/${slug(book)}`;
    if (this.bookCache.has(cacheId)) return this.bookCache.get(cacheId) ?? null;
    try {
      const res = await fetch(`/bibles/${folder}/${slug(book)}.json`);
      if (!res.ok) {
        this.bookCache.set(cacheId, null);
        return null;
      }
      const chapters = normaliseBook(await res.json());
      this.bookCache.set(cacheId, chapters);
      return chapters;
    } catch {
      this.bookCache.set(cacheId, null);
      return null;
    }
  }

  private async loadFromFile(
    translation: TranslationCode,
    book: string,
    chapter: number,
    verse: number,
    verseEnd?: number,
  ): Promise<FetchedVerse | null> {
    const chapters = await this.loadBookFile(translation, book);
    const ch = chapters?.[String(chapter)];
    if (!ch) return null;

    // Verse range: join the individual verses (flat files store one per key)
    if (verseEnd && verseEnd !== verse) {
      const pieces: string[] = [];
      for (let v = verse; v <= verseEnd; v++) {
        const entry = ch[String(v)];
        if (entry?.text) pieces.push(entry.text);
      }
      if (pieces.length) {
        return {
          text: pieces.join(' '),
          reference: this.formatRef(book, chapter, verse, verseEnd),
          translation,
          source: 'offline',
        };
      }
    }

    const direct = ch[String(verse)];
    if (direct?.text) {
      return {
        text: direct.text,
        reference: this.formatRef(book, chapter, verse, verseEnd ?? direct.end),
        translation,
        source: 'offline',
      };
    }

    // Legacy files sometimes store a block keyed by its start verse
    for (const [startStr, entry] of Object.entries(ch)) {
      const start = Number(startStr);
      const end = entry.end ?? start;
      if (verse >= start && (verseEnd ?? verse) <= end) {
        return {
          text: entry.text,
          reference: this.formatRef(book, chapter, start, end),
          translation,
          source: 'offline',
        };
      }
    }
    return null;
  }

  private async loadFromGetBible(
    translation: TranslationCode,
    book: string,
    chapter: number,
    verse: number,
    verseEnd?: number,
  ): Promise<FetchedVerse | null> {
    const slugT = GETBIBLE_SLUG[translation];
    const bookName = GETBIBLE_BOOKS[book];
    if (!slugT || !bookName) return null;
    const range = verseEnd && verseEnd !== verse ? `${verse}-${verseEnd}` : `${verse}`;
    const query = `${bookName} ${chapter}:${range}`;
    try {
      const res = await fetch(`https://query.getbible.net/v2/${slugT}/${encodeURIComponent(query)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as Record<
        string,
        { verses?: Array<{ text?: string }>; ref?: string[] }
      >;
      const pieces: string[] = [];
      let ref = '';
      for (const key of Object.keys(data ?? {})) {
        const entry = data[key];
        if (!ref && Array.isArray(entry?.ref) && entry.ref.length) ref = entry.ref.join(', ');
        for (const v of entry?.verses ?? []) if (v?.text) pieces.push(stripHtml(v.text));
      }
      const text = pieces.join(' ').trim();
      if (!text) return null;
      return {
        text,
        reference: ref || this.formatRef(book, chapter, verse, verseEnd),
        translation,
        source: 'live',
      };
    } catch {
      return null;
    }
  }

  private formatRef(book: string, chapter: number, verse: number, verseEnd?: number) {
    const display = book === 'Psalms' ? 'Psalm' : book;
    return verseEnd && verseEnd !== verse
      ? `${display} ${chapter}:${verse}-${verseEnd}`
      : `${display} ${chapter}:${verse}`;
  }
}

export const BibleService = new BibleServiceImpl();
