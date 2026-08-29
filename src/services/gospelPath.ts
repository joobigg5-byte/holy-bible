/**
 * The Coming to Christ path.
 *
 * Framing text is written for this app. The gospel content is scripture, stored
 * as references rather than text and resolved at runtime from whichever
 * translation the reader has chosen — so the whole path works in all fifteen
 * languages, offline, with nothing to retranslate.
 *
 * A reader's decision is recorded on their device only. It is never
 * transmitted, and it exists so the app can stop asking someone who has already
 * answered — not to be counted.
 */
import type { LanguageCode } from '@/data/languages';
import { fetchVerseText } from './bibleReader';

const PATH_URL = '/gospel/path.json';

/** Internal language code -> translation file. */
const I18N: Partial<Record<LanguageCode, string>> = {
  rv1960: 'es', lsg: 'fr', de: 'de', it: 'it', jfa: 'pt', rus: 'ru',
  chi: 'zh', ja: 'ja', svd: 'ar', hin: 'hi', swa: 'sw',
  twi: 'tw', yor: 'yo', zul: 'zu',
};

export type Confidence = 'high' | 'medium' | 'low';

export interface Translation {
  _name: string;
  _confidence: Confidence;
  _verified: boolean;
  _rtl?: boolean;
  _warning?: string;
  title: string;
  intro: string;
  stages: Record<string, { title: string; body: string }>;
  steps: string[];
  prayerIntro: string;
  prayer: string;
}

export interface StageRef {
  book: string;
  chapter: number;
  verse: number;
}

export interface ResolvedVerse extends StageRef {
  reference: string;
  text: string;
}

export interface Stage {
  id: string;
  title: string;
  body: string;
  refs: StageRef[];
  steps?: string[];
  prayer?: { intro: string; text: string };
}

export interface GospelPath {
  title: string;
  intro: string;
  stages: Stage[];
}

let cache: GospelPath | null = null;
let loading: Promise<GospelPath | null> | null = null;

export async function loadPath(): Promise<GospelPath | null> {
  if (cache) return cache;
  if (loading) return loading;
  loading = fetch(PATH_URL)
    .then((r) => (r.ok ? (r.json() as Promise<GospelPath>) : null))
    .then((d) => {
      cache = d;
      return d;
    })
    .catch(() => null);
  return loading;
}

const display = (book: string) => (book === 'Psalms' ? 'Psalm' : book);

const i18nCache = new Map<string, Translation | null>();

/**
 * Framing text in the reader's language.
 *
 * Returns null for English, and for any language with no translation file —
 * fall back to the English path in that case. The scripture within each stage
 * is resolved separately and always appears in the reader's own translation,
 * so even an English framing carries the verses in their language.
 */
export async function loadTranslation(
  language: LanguageCode,
): Promise<Translation | null> {
  const code = I18N[language];
  if (!code) return null;
  if (i18nCache.has(code)) return i18nCache.get(code) ?? null;
  try {
    const res = await fetch(`/gospel/i18n/${code}.json`);
    const t = res.ok ? ((await res.json()) as Translation) : null;
    i18nCache.set(code, t);
    return t;
  } catch {
    i18nCache.set(code, null);
    return null;
  }
}

/**
 * Whether a translation is safe to show without a caveat.
 *
 * Low-confidence drafts were written without native fluency. Show the English
 * alongside, or hold them back, until a native speaker has signed them off and
 * `_verified` is set to true.
 */
export function isTrustworthy(t: Translation | null): boolean {
  if (!t) return true;             // English original
  return t._verified || t._confidence === 'high';
}

/** Resolve a stage's references in the reader's own translation. */
export async function resolveStage(
  stage: Stage,
  language: LanguageCode = 'kjv',
): Promise<ResolvedVerse[]> {
  const out: ResolvedVerse[] = [];
  for (const ref of stage.refs) {
    let text = await fetchVerseText(language, ref.book, ref.chapter, ref.verse);
    if (!text && language !== 'kjv') {
      text = await fetchVerseText('kjv', ref.book, ref.chapter, ref.verse);
    }
    if (!text) continue;
    out.push({
      ...ref,
      reference: `${display(ref.book)} ${ref.chapter}:${ref.verse}`,
      text,
    });
  }
  return out;
}

/* ------------------------------------------------------------ local record */

const KEY = 'aihb_decision';

export interface Decision {
  /** ISO date. */
  at: string;
  /** Optional — entirely the reader's own words. */
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
  const d: Decision = { at: new Date().toISOString(), note: note?.trim() || undefined };
  localStorage.setItem(KEY, JSON.stringify(d));
  return d;
}

export function clearDecision() {
  localStorage.removeItem(KEY);
}

/** Days since the decision — for an anniversary note on the home screen. */
export function daysSinceDecision(): number | null {
  const d = getDecision();
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d.at).getTime()) / 86_400_000);
}
