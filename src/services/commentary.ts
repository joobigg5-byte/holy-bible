/**
 * Matthew Henry's Complete Commentary (1708–1710) and Spurgeon's
 * Morning and Evening (1865). Both public domain.
 *
 * The commentary is 33 MB across 66 files, so it is loaded strictly per
 * chapter and never precached. Spurgeon is 1.4 MB and loads as one file.
 */

export interface Devotional {
  verse: string;
  reference: string;
  body: string;
}

/* ---------------------------------------------------------------- commentary */

const commentaryCache = new Map<string, Record<string, string[]>>();

/** Commentary paragraphs for one chapter. Empty array when unavailable. */
export async function getCommentary(book: string, chapter: number): Promise<string[]> {
  const slug = book.toLowerCase().replace(/\s+/g, '_');
  try {
    let file = commentaryCache.get(slug);
    if (!file) {
      const res = await fetch(`/commentary/matthew_henry/${slug}.json`);
      if (!res.ok) return [];
      file = (await res.json()) as Record<string, string[]>;
      commentaryCache.set(slug, file);
    }
    return file[String(chapter)] ?? [];
  } catch {
    return [];
  }
}

/**
 * Paragraphs beginning with § are section headings in the original.
 * Render them as headings rather than body text.
 */
export function isHeading(paragraph: string) {
  return paragraph.startsWith('§');
}

export function headingText(paragraph: string) {
  return paragraph.replace(/^§\s*/, '');
}

/* --------------------------------------------------------------- devotional */

type SpurgeonFile = Record<string, { morning: Devotional; evening: Devotional }>;

let spurgeon: SpurgeonFile | null = null;
let loading: Promise<SpurgeonFile | null> | null = null;

async function loadSpurgeon(): Promise<SpurgeonFile | null> {
  if (spurgeon) return spurgeon;
  if (loading) return loading;
  loading = fetch('/devotionals/spurgeon.json')
    .then((r) => (r.ok ? (r.json() as Promise<SpurgeonFile>) : null))
    .then((d) => {
      spurgeon = d;
      return d;
    })
    .catch(() => null);
  return loading;
}

/**
 * Spurgeon wrote a morning and an evening reading for every day of the year,
 * which lines up with the app's own watches. The afternoon watch has no
 * counterpart, so it falls back to the morning reading.
 */
export async function getDevotional(
  watch: 'morning' | 'afternoon' | 'evening',
  date: Date = new Date(),
): Promise<Devotional | null> {
  const data = await loadSpurgeon();
  if (!data) return null;
  const day = data[`${date.getMonth() + 1}-${date.getDate()}`];
  if (!day) return null;
  return watch === 'evening' ? day.evening : day.morning;
}
