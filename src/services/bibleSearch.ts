/**
 * Bible search.
 *
 * Reuses the inverted index already shipped for the Scribe, so this costs no
 * extra download. Two modes, chosen automatically:
 *
 *   "john 3:16" / "psalm 23"  -> reference lookup, jumps straight there
 *   "lamp unto my feet"       -> phrase search, exact matches ranked first
 */
import type { LanguageCode } from '@/data/languages';
import { fetchVerseText } from './bibleReader';

const INDEX_URL = '/scribe-index.json';

interface RawIndex {
  verses: Record<string, string>;
  index: Record<string, number[]>;
}

export interface SearchResult {
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
  exact: boolean;
}

export interface ReferenceMatch {
  book: string;
  chapter: number;
  verse?: number;
}

let cache: RawIndex | null = null;
let loading: Promise<RawIndex | null> | null = null;

async function loadIndex(): Promise<RawIndex | null> {
  if (cache) return cache;
  if (loading) return loading;
  loading = fetch(INDEX_URL)
    .then((r) => (r.ok ? (r.json() as Promise<RawIndex>) : null))
    .then((d) => {
      cache = d;
      return d;
    })
    .catch(() => null);
  return loading;
}

const BOOKS = [
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

/** Common shorthands people actually type. */
const ALIASES: Record<string, string> = {
  ps: 'Psalms', psalm: 'Psalms', psa: 'Psalms', pslm: 'Psalms',
  gen: 'Genesis', ex: 'Exodus', exo: 'Exodus', lev: 'Leviticus', num: 'Numbers',
  deut: 'Deuteronomy', deu: 'Deuteronomy', josh: 'Joshua', judg: 'Judges',
  sam: 'Samuel', kgs: 'Kings', chron: 'Chronicles', chr: 'Chronicles',
  neh: 'Nehemiah', prov: 'Proverbs', pro: 'Proverbs', eccl: 'Ecclesiastes',
  ecc: 'Ecclesiastes', song: 'Song of Solomon', sos: 'Song of Solomon',
  isa: 'Isaiah', jer: 'Jeremiah', lam: 'Lamentations', ezek: 'Ezekiel',
  eze: 'Ezekiel', dan: 'Daniel', hos: 'Hosea', obad: 'Obadiah', mic: 'Micah',
  nah: 'Nahum', hab: 'Habakkuk', zeph: 'Zephaniah', hag: 'Haggai',
  zech: 'Zechariah', mal: 'Malachi', matt: 'Matthew', mat: 'Matthew',
  mk: 'Mark', lk: 'Luke', jn: 'John', rom: 'Romans', cor: 'Corinthians',
  gal: 'Galatians', eph: 'Ephesians', phil: 'Philippians', php: 'Philippians',
  col: 'Colossians', thess: 'Thessalonians', tim: 'Timothy', phlm: 'Philemon',
  heb: 'Hebrews', jas: 'James', pet: 'Peter', rev: 'Revelation',
};

/** "john 3:16", "1 cor 13", "psalm 23:1" — returns null if it isn't a reference. */
export function parseReference(query: string): ReferenceMatch | null {
  const m = query
    .trim()
    .match(/^([1-3]?\s*[a-z][a-z\s]*?)\s*(\d{1,3})(?:\s*[:.\s]\s*(\d{1,3}))?$/i);
  if (!m) return null;

  const [, rawBook, chStr, vStr] = m;
  const cleaned = rawBook.trim().toLowerCase().replace(/\s+/g, ' ');

  // Split a leading ordinal: "1 cor" -> prefix "1", rest "cor"
  const ord = cleaned.match(/^([1-3])\s*(.+)$/);
  const prefix = ord ? ord[1] + ' ' : '';
  const stem = (ord ? ord[2] : cleaned).replace(/\.$/, '');

  const expanded = ALIASES[stem] ?? stem;
  const candidate = (prefix + expanded).toLowerCase();

  let book = BOOKS.find((b) => b.toLowerCase() === candidate);
  if (!book) book = BOOKS.find((b) => b.toLowerCase().startsWith(candidate));
  if (!book && !prefix) book = BOOKS.find((b) => b.toLowerCase().includes(candidate));
  if (!book) return null;

  return { book, chapter: Number(chStr), verse: vStr ? Number(vStr) : undefined };
}

const STOP = new Set(
  'the and that unto for but with was are his her him them they this which shall'.split(' '),
);

/**
 * Phrase search. Verses containing the whole phrase are ranked above verses
 * that merely share its words.
 */
export async function searchBible(
  query: string,
  translation: LanguageCode = 'kjv',
  limit = 25,
): Promise<SearchResult[]> {
  const idx = await loadIndex();
  if (!idx) return [];

  const phrase = query.trim().toLowerCase();
  if (phrase.length < 2) return [];

  // Compare without punctuation so "be still and know" matches
  // "Be still, and know that I am God".
  const flatten = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const flatPhrase = flatten(phrase);

  const words = (phrase.match(/[a-z]{2,}/g) ?? []).filter((w) => !STOP.has(w));
  if (!words.length) return [];

  // Candidates = verses containing the rarest word, intersected with the rest
  const postings = words
    .map((w) => idx.index[w])
    .filter((p): p is number[] => Boolean(p?.length))
    .sort((a, b) => a.length - b.length);

  if (!postings.length) return [];

  let candidates = new Set(postings[0]);
  for (const p of postings.slice(1)) {
    const set = new Set(p);
    const next = new Set<number>();
    for (const id of candidates) if (set.has(id)) next.add(id);
    // Keep going only while the intersection stays useful
    if (next.size >= 3) candidates = next;
  }

  const results: SearchResult[] = [];
  for (const id of candidates) {
    if (results.length >= limit * 3) break;
    const loc = idx.verses[String(id)];
    if (!loc) continue;
    const [book, chStr, vStr] = loc.split('|');
    const chapter = Number(chStr);
    const verse = Number(vStr);

    let text = await fetchVerseText(translation, book, chapter, verse);
    if (!text && translation !== 'kjv') {
      text = await fetchVerseText('kjv', book, chapter, verse);
    }
    if (!text) continue;

    results.push({
      book,
      chapter,
      verse,
      reference: `${book === 'Psalms' ? 'Psalm' : book} ${chapter}:${verse}`,
      text,
      exact: flatten(text).includes(flatPhrase),
    });
  }

  // Exact phrase first, then canonical order so results read naturally
  const order = (b: string) => BOOKS.indexOf(b);
  results.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact ? -1 : 1;
    return order(a.book) - order(b.book) || a.chapter - b.chapter || a.verse - b.verse;
  });

  return results.slice(0, limit);
}
