/**
 * The Coming to Christ path.
 *
 * Scripture is stored as references, never as text, and resolved at runtime
 * from the reader's own translation. That means the whole path works in all
 * fifteen languages with nothing to retranslate.
 *
 * The prayer is a sinner's prayer in the standard form used across the church
 * for generations. `{when}` is substituted to match the watch, so it reads
 * "Tonight, I have heard Your Word" in the evening and "Today" otherwise.
 */
import type { LanguageCode } from '@/data/languages';
import { fetchVerseText } from './bibleReader';
import type { WatchPeriod } from '@/data/lectionary';

const URL_PATH = '/gospel/path.json';

interface RawRef {
  book: string;
  chapter: number;
  verse: number;
}

interface RawStage {
  id: string;
  title: string;
  body: string;
  refs: RawRef[];
  steps?: string[];
  prayer?: { intro: string; text: string; afterword?: string };
}

interface RawPath {
  title: string;
  intro: string;
  stages: RawStage[];
}

export interface Passage {
  reference: string;
  text: string;
}

export interface Stage {
  id: string;
  title: string;
  body: string;
  passages: Passage[];
  steps?: string[];
  prayer?: { intro: string; text: string; afterword?: string };
}

export interface GospelPath {
  title: string;
  intro: string;
  stages: Stage[];
}

let raw: RawPath | null = null;
let loading: Promise<RawPath | null> | null = null;

async function load(): Promise<RawPath | null> {
  if (raw) return raw;
  if (loading) return loading;
  loading = fetch(URL_PATH)
    .then((r) => (r.ok ? (r.json() as Promise<RawPath>) : null))
    .then((d) => {
      raw = d;
      return d;
    })
    .catch(() => null);
  return loading;
}

const display = (book: string) => (book === 'Psalms' ? 'Psalm' : book);

/**
 * Build the path in the reader's translation.
 * Falls back to KJV per verse when a translation lacks the book.
 */
export async function getGospelPath(
  translation: LanguageCode = 'kjv',
  watch: WatchPeriod = 'morning',
): Promise<GospelPath | null> {
  const data = await load();
  if (!data) return null;

  const when = watch === 'evening' ? 'Tonight' : 'Today';

  const stages: Stage[] = [];
  for (const stage of data.stages) {
    const passages: Passage[] = [];
    for (const ref of stage.refs) {
      let text = await fetchVerseText(translation, ref.book, ref.chapter, ref.verse);
      if (!text && translation !== 'kjv') {
        text = await fetchVerseText('kjv', ref.book, ref.chapter, ref.verse);
      }
      if (text) {
        passages.push({
          reference: `${display(ref.book)} ${ref.chapter}:${ref.verse}`,
          text,
        });
      }
    }

    const built: Stage = { id: stage.id, title: stage.title, body: stage.body, passages };
    if (stage.steps) built.steps = stage.steps;
    if (stage.prayer) {
      built.prayer = {
        ...stage.prayer,
        text: stage.prayer.text
          .replace(/^\{when\}/gm, when)
          .replace(/\{when\}/g, when.toLowerCase()),
      };
    }
    stages.push(built);
  }

  return { title: data.title, intro: data.intro, stages };
}

/* -------------------------------------------------------------------------
 * A private record, for the reader alone
 *
 * No server, no counter, no announcement. Someone who prays this can mark the
 * date so they can come back to it on a day when they doubt it happened.
 * ---------------------------------------------------------------------- */

const KEY = 'aihb_decision';

export interface Decision {
  date: string;
  note?: string;
}

export function getDecision(): Decision | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Decision) : null;
  } catch {
    return null;
  }
}

export function recordDecision(note?: string): Decision {
  const d: Decision = { date: new Date().toISOString(), note: note?.trim() || undefined };
  localStorage.setItem(KEY, JSON.stringify(d));
  return d;
}

export function clearDecision() {
  localStorage.removeItem(KEY);
}
