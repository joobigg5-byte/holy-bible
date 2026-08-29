/**
 * Bible dictionary, and biblical places then and now.
 *
 * Dictionary: 5,742 merged entries from Easton's (1897) and Smith's (1884),
 * both long in the public domain. Split by first letter so a lookup fetches one
 * small file rather than 4.6 MB. The 183 KB index loads once and drives search.
 *
 * Attribution required — CC BY 4.0, NEUU bible-dictionary-dataset from CCEL
 * public-domain texts. Put a line in Settings.
 *
 * Places: each entry states how confident the identification actually is.
 * Babylon has been dug up; the Garden of Eden has not been found and this says
 * so rather than pointing at a spot in Iraq.
 */

/* ------------------------------------------------------------- dictionary */

export interface Definition {
  /** EAS = Easton's, SMI = Smith's. */
  source: string;
  text: string;
}

export interface DictionaryEntry {
  name: string;
  definitions: Definition[];
}

interface IndexEntry { s: string; n: string }

interface DictIndex {
  count: number;
  sources: Record<string, string>;
  attribution: string;
  entries: IndexEntry[];
}

let dictIndex: DictIndex | null = null;
let indexLoading: Promise<DictIndex | null> | null = null;
const letterCache = new Map<string, Record<string, DictionaryEntry>>();

export async function loadDictionaryIndex(): Promise<DictIndex | null> {
  if (dictIndex) return dictIndex;
  if (indexLoading) return indexLoading;
  indexLoading = fetch('/dictionary/_index.json')
    .then((r) => (r.ok ? (r.json() as Promise<DictIndex>) : null))
    .then((d) => { dictIndex = d; return d; })
    .catch(() => null);
  return indexLoading;
}

const letterFor = (slug: string) => {
  const c = slug[0]?.toLowerCase() ?? '';
  return /[a-z]/.test(c) ? c : 'a';
};

export async function lookupWord(slug: string): Promise<DictionaryEntry | null> {
  const letter = letterFor(slug);
  try {
    let file = letterCache.get(letter);
    if (!file) {
      const res = await fetch(`/dictionary/${letter}.json`);
      if (!res.ok) return null;
      file = (await res.json()) as Record<string, DictionaryEntry>;
      letterCache.set(letter, file);
    }
    return file[slug] ?? null;
  } catch {
    return null;
  }
}

/** Name search over the index. Prefix matches rank above contains. */
export async function searchDictionary(query: string, limit = 30): Promise<IndexEntry[]> {
  const idx = await loadDictionaryIndex();
  if (!idx) return [];
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const starts: IndexEntry[] = [];
  const contains: IndexEntry[] = [];
  for (const e of idx.entries) {
    const n = e.n.toLowerCase();
    if (n.startsWith(q)) starts.push(e);
    else if (n.includes(q)) contains.push(e);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Source label for a definition, e.g. "Easton's Bible Dictionary (1897)". */
export async function sourceName(code: string): Promise<string> {
  const idx = await loadDictionaryIndex();
  return idx?.sources[code] ?? code;
}

/* ----------------------------------------------------------------- places */

export type Certainty = 'identified' | 'continuous' | 'traditional' | 'disputed' | 'unknown';

export interface PlaceRef { book: string; chapter: number; verse: number }

export interface Place {
  name: string;
  /** Where it is now, or "Unknown" / "Disputed — …". */
  modern: string;
  country: string | null;
  lat?: number;
  lon?: number;
  certainty: Certainty;
  note?: string;
  refs: PlaceRef[];
}

let places: Place[] | null = null;
let placesLoading: Promise<Place[]> | null = null;
let certaintyNotes: Record<Certainty, string> | null = null;

export async function loadPlaces(): Promise<Place[]> {
  if (places) return places;
  if (placesLoading) return placesLoading;
  placesLoading = fetch('/places/places.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      places = (d?.places ?? []) as Place[];
      certaintyNotes = d?._certainty ?? null;
      return places;
    })
    .catch(() => []);
  return placesLoading;
}

/** Plain-language explanation of a certainty level, for a tooltip or footnote. */
export function certaintyMeaning(c: Certainty): string {
  return certaintyNotes?.[c] ?? '';
}

export async function searchPlaces(query: string, limit = 20): Promise<Place[]> {
  const all = await loadPlaces();
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return all
    .filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.modern.toLowerCase().includes(q) ||
      (p.country ?? '').toLowerCase().includes(q),
    )
    .slice(0, limit);
}

/** Places mentioned in a given chapter — for a note beside the reading. */
export async function placesInChapter(book: string, chapter: number): Promise<Place[]> {
  const all = await loadPlaces();
  return all.filter((p) => p.refs.some((r) => r.book === book && r.chapter === chapter));
}

/**
 * A map link, when there is a location worth pointing at.
 *
 * Returns null for `unknown` — an app should not drop a pin on the Garden of
 * Eden. OpenStreetMap rather than an embedded map, so nothing loads a tracker
 * and the feature costs no bundle weight.
 */
export function mapLink(p: Place): string | null {
  if (p.certainty === 'unknown' || p.lat === undefined || p.lon === undefined) return null;
  return `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=12/${p.lat}/${p.lon}`;
}
