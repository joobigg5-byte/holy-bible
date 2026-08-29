/**
 * Teachings — wisdom from preachers, kept in three clearly separated tiers.
 *
 *   public-domain  Text is stored and shown. Author died 70+ years ago.
 *   licensed       Text is stored and shown. A rights-holder gave written
 *                  permission. Do not add anything here on a verbal yes.
 *   link-only      NO text is stored. The app embeds or links to the
 *                  speaker's own official channel. The video is served by
 *                  YouTube, the view counts to the ministry, their ads run.
 *
 * The tier split is the whole point. Embedding a sermon is fine — that is what
 * the embed player exists for, and it sends people to the source. Copying the
 * words out of it into your own database is not, whatever the medium. Living
 * preachers belong in link-only until you have permission in writing.
 *
 * A second reason for link-only: attribution. A great deal of text circulating
 * under these men's names online was never said by them. A video on the
 * ministry's own channel carries its own proof.
 */

const CATALOGUE_URL = '/teachings/catalogue.json';

export type Licence = 'public-domain' | 'licensed' | 'link-only';

export type Theme =
  | 'faith' | 'fear' | 'grace' | 'hope' | 'prayer' | 'suffering'
  | 'joy' | 'perseverance' | 'humility' | 'love' | 'provision' | 'rest';

export interface Speaker {
  id: string;
  name: string;
  years?: string;
  licence: Licence;
  /** Required for link-only speakers so readers can reach the source. */
  channelUrl?: string;
}

export interface Quote {
  speaker: string;
  text: string;
  theme: Theme;
  source: string;
  scripture?: string;
}

export interface Video {
  speaker: string;
  title: string;
  youtubeId: string;
  channel: string;
  channelUrl: string;
  theme: Theme;
  minutes?: number;
}

interface Catalogue {
  speakers: Speaker[];
  quotes: Quote[];
  videos: Video[];
}

let cache: Catalogue | null = null;
let loading: Promise<Catalogue | null> | null = null;

export async function loadTeachings(): Promise<Catalogue | null> {
  if (cache) return cache;
  if (loading) return loading;
  loading = fetch(CATALOGUE_URL)
    .then((r) => (r.ok ? (r.json() as Promise<Catalogue>) : null))
    .then((d) => {
      cache = d;
      return d;
    })
    .catch(() => null);
  return loading;
}

export async function getSpeaker(id: string): Promise<Speaker | undefined> {
  return (await loadTeachings())?.speakers.find((s) => s.id === id);
}

/**
 * Guard against the mistake that matters: storing text for someone whose
 * licence tier does not permit it. Call this in any tooling that adds quotes.
 */
export async function canStoreText(speakerId: string): Promise<boolean> {
  const s = await getSpeaker(speakerId);
  return s?.licence === 'public-domain' || s?.licence === 'licensed';
}

/** Map a verse's own wording to a theme, so teachings can follow the reading. */
const THEME_WORDS: Record<Theme, RegExp> = {
  faith: /\b(faith|believe|believeth|trust|trusteth)\b/i,
  fear: /\b(fear|afraid|dread|terror|dismayed)\b/i,
  grace: /\b(grace|mercy|merciful|forgive|forgiven|pardon)\b/i,
  hope: /\b(hope|promise|promised|expectation)\b/i,
  prayer: /\b(pray|prayer|prayeth|supplication|intercession)\b/i,
  suffering: /\b(affliction|tribulation|suffer|sorrow|trial|persecut)\b/i,
  joy: /\b(joy|rejoice|glad|delight|praise)\b/i,
  perseverance: /\b(endure|endureth|patience|steadfast|continue|persever)\b/i,
  humility: /\b(humble|lowly|meek|pride|proud)\b/i,
  love: /\b(love|loveth|beloved|charity|kindness)\b/i,
  provision: /\b(provide|supply|bread|need|shepherd|feed)\b/i,
  rest: /\b(rest|peace|quiet|still|sleep|refuge)\b/i,
};

export function themeForVerse(text: string): Theme | null {
  for (const [theme, re] of Object.entries(THEME_WORDS) as [Theme, RegExp][]) {
    if (re.test(text)) return theme;
  }
  return null;
}

/** Quotes for a theme. Only ever returns text-bearing tiers. */
export async function getQuotes(theme: Theme, limit = 3): Promise<Quote[]> {
  const data = await loadTeachings();
  if (!data) return [];
  const allowed = new Set(
    data.speakers.filter((s) => s.licence !== 'link-only').map((s) => s.id),
  );
  return data.quotes.filter((q) => q.theme === theme && allowed.has(q.speaker)).slice(0, limit);
}

/** Videos for a theme. These are embeds, never stored text. */
export async function getVideos(theme: Theme, limit = 4): Promise<Video[]> {
  const data = await loadTeachings();
  if (!data) return [];
  return data.videos.filter((v) => v.theme === theme).slice(0, limit);
}

/**
 * Privacy-preserving embed URL. youtube-nocookie serves the same player
 * without dropping tracking cookies, which suits an app with no sign-in.
 */
export function embedUrl(youtubeId: string) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?rel=0`;
}

/** Everything a reader has saved themselves. Never leaves the device. */
const OWN_KEY = 'aihb_own_quotes';

export interface OwnQuote {
  id: string;
  text: string;
  speaker: string;
  note?: string;
  savedAt: string;
}

export function getOwnQuotes(): OwnQuote[] {
  try {
    return JSON.parse(localStorage.getItem(OWN_KEY) ?? '[]') as OwnQuote[];
  } catch {
    return [];
  }
}

export function saveOwnQuote(text: string, speaker: string, note?: string) {
  const all = getOwnQuotes();
  all.unshift({
    id: `${Date.now()}`,
    text: text.trim(),
    speaker: speaker.trim(),
    note: note?.trim(),
    savedAt: new Date().toISOString(),
  });
  localStorage.setItem(OWN_KEY, JSON.stringify(all));
  return all;
}

export function deleteOwnQuote(id: string) {
  const all = getOwnQuotes().filter((q) => q.id !== id);
  localStorage.setItem(OWN_KEY, JSON.stringify(all));
  return all;
}
