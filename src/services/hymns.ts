/**
 * Hymns.
 *
 * 260 gospel hymns, texts only — no tunes or recordings, which carry their own
 * separate rights.
 *
 * On copyright: the texts are overwhelmingly 19th-century gospel hymnody and
 * long out of copyright, but a handful in this collection are 20th century and
 * still administered. Those carry a `rightsReview` note and are hidden by
 * default. `How Great Thou Art` in particular is the 1949 Hine translation and
 * must not ship without a licence, however traditional it feels.
 *
 * The source is a compiled hymnal, and a compilation can hold copyright in its
 * selection and numbering even where the individual texts are free. The
 * hymnal's numbering is therefore not reproduced — hymns are sorted by title.
 */

const URL_PATH = '/hymns/hymns.json';

export type HymnTheme =
  | 'evening' | 'morning' | 'grace' | 'cross' | 'comfort' | 'praise'
  | 'faith' | 'guidance' | 'hope' | 'prayer' | 'consecration' | 'communion';

export interface Hymn {
  slug: string;
  title: string;
  /** Each verse is an array of lines. */
  verses: string[][];
  refrain: string[] | null;
  theme: HymnTheme;
  lines: number;
  /** Present when the hymn's rights status needs checking before display. */
  rightsReview?: string;
  /** Key into tunes.json when a playable melody exists. */
  tune?: string;
}

let cache: Hymn[] | null = null;
let loading: Promise<Hymn[]> | null = null;

async function load(): Promise<Hymn[]> {
  if (cache) return cache;
  if (loading) return loading;
  loading = fetch(URL_PATH)
    .then((r) => (r.ok ? (r.json() as Promise<Hymn[]>) : []))
    .then((d) => {
      cache = d;
      return d;
    })
    .catch(() => []);
  return loading;
}

/**
 * All hymns clear to display.
 *
 * @param includeUnreviewed pass true ONLY after you have checked the rights on
 *        the flagged titles for your jurisdiction. Default false is the safe
 *        setting and the one to ship with.
 */
export async function getHymns(includeUnreviewed = false): Promise<Hymn[]> {
  const all = await load();
  return includeUnreviewed ? all : all.filter((h) => !h.rightsReview);
}

/** The flagged ones, so you can work through them. */
export async function getFlaggedHymns(): Promise<Hymn[]> {
  return (await load()).filter((h) => h.rightsReview);
}

export async function getHymn(slug: string): Promise<Hymn | undefined> {
  return (await getHymns()).find((h) => h.slug === slug);
}

export async function getHymnsByTheme(theme: HymnTheme, limit = 10): Promise<Hymn[]> {
  return (await getHymns()).filter((h) => h.theme === theme).slice(0, limit);
}

/** Title and first-line search. */
export async function searchHymns(query: string, limit = 20): Promise<Hymn[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const all = await getHymns();

  const scored = all
    .map((h) => {
      const title = h.title.toLowerCase();
      const firstLine = (h.verses[0]?.[0] ?? '').toLowerCase();
      if (title.startsWith(q)) return { h, rank: 0 };
      if (title.includes(q)) return { h, rank: 1 };
      if (firstLine.includes(q)) return { h, rank: 2 };
      const body = h.verses.flat().join(' ').toLowerCase();
      if (body.includes(q)) return { h, rank: 3 };
      return null;
    })
    .filter((x): x is { h: Hymn; rank: number } => x !== null)
    .sort((a, b) => a.rank - b.rank || a.h.title.localeCompare(b.h.title));

  return scored.slice(0, limit).map((x) => x.h);
}

/** Deterministic hymn of the day — same for everyone, changes daily. */
export async function getHymnOfDay(date: Date = new Date()): Promise<Hymn | null> {
  const all = await getHymns();
  if (!all.length) return null;
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return all[day % all.length];
}

/** Flatten for the speech engine, which takes plain text. */
export function hymnToSpeech(h: Hymn): string {
  const parts: string[] = [h.title];
  for (const verse of h.verses) {
    parts.push(verse.join(' '));
    if (h.refrain) parts.push(h.refrain.join(' '));
  }
  return parts.join('. ');
}
