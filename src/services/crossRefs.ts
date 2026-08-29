/**
 * Cross-references.
 *
 * Data: OpenBible.info community cross-references (CC BY), derived in part from
 * the Treasury of Scripture Knowledge. Attribution is required — see the note
 * rendered in CrossRefs.tsx.
 *
 * Stored as `bookIndex.chapter.verse` keys pointing at up to 8 target refs,
 * ranked by community vote. ~2.2 MB raw, ~620 KB gzipped, lazy-loaded on first
 * use and then cached by the service worker.
 */
import type { LanguageCode } from '@/data/languages';
import { fetchVerseText } from './bibleReader';

const URL_PATH = '/cross-references.json';

interface Payload {
  books: string[];
  refs: Record<string, string[]>;
}

export interface CrossRef {
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
}

let cache: Payload | null = null;
let loading: Promise<Payload | null> | null = null;

async function load(): Promise<Payload | null> {
  if (cache) return cache;
  if (loading) return loading;
  loading = fetch(URL_PATH)
    .then((r) => (r.ok ? (r.json() as Promise<Payload>) : null))
    .then((d) => {
      cache = d;
      return d;
    })
    .catch(() => null);
  return loading;
}

const display = (book: string) => (book === 'Psalms' ? 'Psalm' : book);

/** Cross-references for a verse, rendered in the reader's translation. */
export async function getCrossRefs(
  book: string,
  chapter: number,
  verse: number,
  translation: LanguageCode = 'kjv',
  limit = 6,
): Promise<CrossRef[]> {
  const data = await load();
  if (!data) return [];

  const bookIndex = data.books.indexOf(book);
  if (bookIndex < 0) return [];

  const targets = data.refs[`${bookIndex}.${chapter}.${verse}`];
  if (!targets?.length) return [];

  const out: CrossRef[] = [];
  for (const target of targets) {
    if (out.length >= limit) break;
    const [b, c, v] = target.split('.');
    const targetBook = data.books[Number(b)];
    if (!targetBook) continue;
    const ch = Number(c);
    const vs = Number(v);

    let text = await fetchVerseText(translation, targetBook, ch, vs);
    if (!text && translation !== 'kjv') {
      text = await fetchVerseText('kjv', targetBook, ch, vs);
    }
    if (!text) continue;

    out.push({
      book: targetBook,
      chapter: ch,
      verse: vs,
      reference: `${display(targetBook)} ${ch}:${vs}`,
      text,
    });
  }
  return out;
}

/** Cheap check for whether to show the cross-reference control at all. */
export async function hasCrossRefs(book: string, chapter: number, verse: number) {
  const data = await load();
  if (!data) return false;
  const i = data.books.indexOf(book);
  return i >= 0 && Boolean(data.refs[`${i}.${chapter}.${verse}`]?.length);
}
