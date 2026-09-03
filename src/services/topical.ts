/**
 * Nave's Topical Bible (1897) — 5,320 topics, 57,559 references.
 *
 * The standard topical index: pick a subject and get every relevant passage,
 * grouped under the headings Nave arranged them by. Where the Scribe searches
 * by wording, this searches by subject, so "the second coming" finds passages
 * that never use those words.
 *
 * Split one file per topic so a lookup fetches a few kilobytes.
 */
import type { LanguageCode } from '@/data/languages';
import { fetchVerseText } from './bibleReader';

export interface TopicSummary {
  /** slug */ s: string;
  /** name */ n: string;
  /** entry count */ e: number;
  /** reference count */ r: number;
}

export interface TopicEntry {
  /** Heading, e.g. "ENJOINED" or "Daily, in the morning". */
  h: string;
  /** References as "Book|chapter|verse". */
  r: string[];
}

export interface Topic {
  name: string;
  seeAlso: string[];
  entries: TopicEntry[];
}

export interface TopicVerse {
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
}

let index: { count: number; attribution: string; topics: TopicSummary[] } | null = null;
let loading: Promise<typeof index> | null = null;
const cache = new Map<string, Topic | null>();

export async function loadTopicIndex() {
  if (index) return index;
  if (loading) return loading;
  loading = fetch('/topical/_index.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { index = d; return d; })
    .catch(() => null);
  return loading;
}

export async function searchTopics(query: string, limit = 40): Promise<TopicSummary[]> {
  const idx = await loadTopicIndex();
  if (!idx) return [];
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const starts: TopicSummary[] = [];
  const contains: TopicSummary[] = [];
  for (const t of idx.topics) {
    const n = t.n.toLowerCase();
    if (n.startsWith(q)) starts.push(t);
    else if (n.includes(q)) contains.push(t);
  }
  // Richer topics first among equally good matches
  const byWeight = (a: TopicSummary, b: TopicSummary) => b.r - a.r;
  return [...starts.sort(byWeight), ...contains.sort(byWeight)].slice(0, limit);
}

export async function getTopic(slug: string): Promise<Topic | null> {
  if (cache.has(slug)) return cache.get(slug) ?? null;
  try {
    const res = await fetch(`/topical/topics/${slug}.json`);
    const t = res.ok ? ((await res.json()) as Topic) : null;
    cache.set(slug, t);
    return t;
  } catch {
    cache.set(slug, null);
    return null;
  }
}

const display = (b: string) => (b === 'Psalms' ? 'Psalm' : b);

/** Resolve an entry's references into readable verses, in the reader's language. */
export async function resolveEntry(
  entry: TopicEntry,
  language: LanguageCode = 'kjv',
  limit = 12,
): Promise<TopicVerse[]> {
  const out: TopicVerse[] = [];
  for (const ref of entry.r.slice(0, limit)) {
    const [book, c, v] = ref.split('|');
    const chapter = Number(c);
    const verse = Number(v);
    let text = await fetchVerseText(language, book, chapter, verse);
    if (!text && language !== 'kjv') text = await fetchVerseText('kjv', book, chapter, verse);
    if (!text) continue;
    out.push({ book, chapter, verse, reference: `${display(book)} ${chapter}:${verse}`, text });
  }
  return out;
}

/** A handful of topics to show before anyone has searched. */
export const SUGGESTED = [
  'Faith', 'Prayer', 'Love', 'Forgiveness', 'Grace', 'Hope',
  'Holy Spirit', 'Repentance', 'Wisdom', 'Suffering', 'Joy', 'Peace',
  'Marriage', 'Children', 'Money', 'Work', 'Death', 'Heaven',
];
