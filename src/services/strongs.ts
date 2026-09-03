/**
 * Strong's Concordance — the original Hebrew and Greek behind each English word.
 *
 * This is the tool preachers reach for: tap "love" in 1 Corinthians 13 and see
 * ἀγάπη, G26, with its definition and every other verse that uses it.
 *
 * Two datasets, both public domain:
 *   - KJV tagged word by word with Strong's numbers
 *   - Strong's Hebrew (H1–H8674) and Greek (G1–G5624) lexicons
 *
 * Split by book and by prefix so a lookup fetches a small file, and cached by
 * the service worker after first use.
 */

export interface Token {
  /** The English word or the punctuation and spacing between words. */
  w: string;
  /** Strong's numbers, when this word translates an original term. */
  s?: string[];
  /**
   * Set when the KJV printed this word in italics — supplied by the
   * translators for English sense, with nothing corresponding in the Hebrew or
   * Greek. Worth showing, since a point is sometimes built on a word that was
   * never in the original.
   */
  i?: 1;
}

export interface LexEntry {
  /** The Hebrew or Greek word. */
  lemma: string;
  /** Transliteration, e.g. "lógos". */
  xlit: string;
  /** Pronunciation guide, e.g. "log'-os". */
  pronounce: string;
  definition: string;
  /** How many times it appears in the KJV. */
  occurrences: number;
  number: string;
  language: 'Hebrew' | 'Greek';
}

const bookSlug = (b: string) => b.toLowerCase().replace(/\s+/g, '_');

const bookCache = new Map<string, Record<string, Record<string, Token[]>> | null>();
const lexCache = new Map<string, Record<string, { l: string; x: string; p: string; d: string; n: number }>>();

/** Tagged words for a verse. Empty when the book has no tagging. */
export async function getTokens(book: string, chapter: number, verse: number): Promise<Token[]> {
  const slug = bookSlug(book);
  try {
    let file = bookCache.get(slug);
    if (file === undefined) {
      const res = await fetch(`/strongs/books/${slug}.json`);
      file = res.ok ? await res.json() : null;
      bookCache.set(slug, file);
    }
    return file?.[String(chapter)]?.[String(verse)] ?? [];
  } catch {
    return [];
  }
}

/** Look up one Strong's number, e.g. "G26" or "H2617". */
export async function lookup(number: string): Promise<LexEntry | null> {
  const prefix = number[0]?.toUpperCase();
  if (prefix !== 'H' && prefix !== 'G') return null;
  try {
    let file = lexCache.get(prefix);
    if (!file) {
      const res = await fetch(`/strongs/lexicon-${prefix}.json`);
      if (!res.ok) return null;
      file = await res.json();
      lexCache.set(prefix, file!);
    }
    const e = file![number.toUpperCase()];
    if (!e) return null;
    return {
      lemma: e.l,
      xlit: e.x,
      pronounce: e.p,
      definition: e.d,
      occurrences: e.n,
      number: number.toUpperCase(),
      language: prefix === 'H' ? 'Hebrew' : 'Greek',
    };
  } catch {
    return null;
  }
}

export interface Occurrence {
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  /** The English word this number was translated as here. */
  word: string;
}

const CANON = [
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

/**
 * Every place a Strong's number appears — the concordance itself.
 *
 * Hebrew numbers only occur in the Old Testament and Greek only in the New, so
 * only half the books are ever searched. Stops at `limit` to keep it quick.
 */
export async function findOccurrences(number: string, limit = 60): Promise<Occurrence[]> {
  const num = number.toUpperCase();
  const testament = num.startsWith('H') ? CANON.slice(0, 39) : CANON.slice(39);
  const found: Occurrence[] = [];

  for (const book of testament) {
    if (found.length >= limit) break;
    const slug = bookSlug(book);
    let file = bookCache.get(slug);
    if (file === undefined) {
      try {
        const res = await fetch(`/strongs/books/${slug}.json`);
        file = res.ok ? await res.json() : null;
      } catch {
        file = null;
      }
      bookCache.set(slug, file);
    }
    if (!file) continue;

    for (const ch of Object.keys(file)) {
      for (const v of Object.keys(file[ch])) {
        for (const t of file[ch][v]) {
          if (!t.s?.includes(num)) continue;
          found.push({
            book,
            chapter: Number(ch),
            verse: Number(v),
            reference: `${book === 'Psalms' ? 'Psalm' : book} ${ch}:${v}`,
            word: t.w.replace(/[.,;:!?]$/, ''),
          });
          if (found.length >= limit) return found;
        }
      }
    }
  }
  return found;
}

/** Distinct English words a number was rendered as, most common first. */
export function renderings(occurrences: Occurrence[]): Array<{ word: string; count: number }> {
  const counts = new Map<string, number>();
  for (const o of occurrences) {
    const w = o.word.toLowerCase().trim();
    if (w) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}
