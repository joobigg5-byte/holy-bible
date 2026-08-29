/**
 * Shared speech engine.
 *
 * Replaces the duplicated pickVoice / LANG_BCP47 logic in useVerseSpeech and
 * useChapterSpeech, and fixes the three bugs that made non-English audio bad:
 *
 *   1. Voices were read synchronously. getVoices() returns [] until the engine
 *      has loaded, so the first playback of a session silently got no voice.
 *   2. When no voice existed for a language, the code fell back to an English
 *      voice and read the foreign text with English phonemes. That is worse
 *      than no audio. We now report 'unavailable' and let the UI decide.
 *   3. Several languages were missing from the BCP-47 map (chi, hin, rus),
 *      so they silently resolved to en-US.
 */

import type { LanguageCode } from '@/data/languages';

/** Internal language code -> BCP-47 tag. Every LanguageCode must appear here. */
export const LANG_BCP47: Record<LanguageCode, string> = {
  kjv: 'en-US',
  twi: 'ak-GH',   // was 'tw-GH'; 'tw' is deprecated in favour of Akan
  yor: 'yo-NG',
  swa: 'sw-KE',
  rv1960: 'es-ES',
  jfa: 'pt-BR',
  lsg: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
  ja: 'ja-JP',
  chi: 'zh-CN',   // was missing -> read Chinese with an English voice
  hin: 'hi-IN',   // was missing
  rus: 'ru-RU',   // was missing
  zul: 'zu-ZA',
  svd: 'ar-SA',
  nld: 'nl-NL',
  kor: 'ko-KR',
};

export type VoiceMatch = 'exact' | 'language' | 'unavailable';

export interface ResolvedVoice {
  voice: SpeechSynthesisVoice | null;
  match: VoiceMatch;
  lang: string;
}

const supported = () =>
  typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';

/* -------------------------------------------------------------------------
 * Voice list loading — async, with a poll fallback for Safari
 * ---------------------------------------------------------------------- */

let voicePromise: Promise<SpeechSynthesisVoice[]> | null = null;

export function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  if (!supported()) return Promise.resolve([]);
  if (voicePromise) return voicePromise;

  voicePromise = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length) return resolve(existing);

    let settled = false;
    let poll: number | undefined;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (poll) window.clearInterval(poll);
      synth.removeEventListener?.('voiceschanged', finish);
      resolve(synth.getVoices());
    };

    synth.addEventListener?.('voiceschanged', finish);
    poll = window.setInterval(() => {
      if (synth.getVoices().length) finish();
    }, 100);
    window.setTimeout(finish, 3000);
  });

  return voicePromise;
}

/* -------------------------------------------------------------------------
 * Resolution
 * ---------------------------------------------------------------------- */

export async function resolveVoice(language: LanguageCode): Promise<ResolvedVoice> {
  const lang = LANG_BCP47[language] ?? 'en-US';
  const voices = await voicesReady();
  if (!voices.length) return { voice: null, match: 'unavailable', lang };

  const tag = (v: SpeechSynthesisVoice) => (v.lang || '').replace('_', '-').toLowerCase();
  const base = lang.split('-')[0].toLowerCase();

  const exact = voices.find((v) => tag(v) === lang.toLowerCase());
  if (exact) return { voice: exact, match: 'exact', lang };

  // Right language, different region (it-CH for it-IT) is perfectly fine.
  const sameLang = voices.filter((v) => tag(v).split('-')[0] === base);
  if (sameLang.length) {
    // Prefer a local voice — network voices stall when the user is offline,
    // which matters a lot for an offline-first devotional app.
    const local = sameLang.find((v) => v.localService);
    return { voice: local ?? sameLang[0], match: 'language', lang };
  }

  return { voice: null, match: 'unavailable', lang };
}

/** Call before rendering an audio control so it can be dimmed rather than lying. */
export async function hasVoiceFor(language: LanguageCode): Promise<boolean> {
  const { match } = await resolveVoice(language);
  return match !== 'unavailable';
}

/* -------------------------------------------------------------------------
 * Chunking — Chrome silently stops after roughly 15 seconds of speech
 * ---------------------------------------------------------------------- */

const MAX_CHUNK = 180;

export function chunkText(text: string, lang: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= MAX_CHUNK) return [clean];

  const cjk = lang.startsWith('ja') || lang.startsWith('zh');
  const parts = cjk ? clean.split(/(?<=[。！？])/) : clean.split(/(?<=[.!?;:])\s+/);

  const chunks: string[] = [];
  let buf = '';
  for (const p of parts) {
    if (buf && (buf + p).length > MAX_CHUNK) {
      chunks.push(buf.trim());
      buf = p;
    } else {
      buf += p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());

  // Hard-split anything still oversized (long verses with no punctuation)
  return chunks.flatMap((c) => {
    if (c.length <= MAX_CHUNK) return [c];
    const out: string[] = [];
    let line = '';
    for (const w of c.split(' ')) {
      if (line && (line + ' ' + w).length > MAX_CHUNK) {
        out.push(line.trim());
        line = w;
      } else {
        line = line ? line + ' ' + w : w;
      }
    }
    if (line.trim()) out.push(line.trim());
    return out;
  });
}

/* -------------------------------------------------------------------------
 * Chrome desktop keepalive — pause/resume stops it cutting out mid-chapter
 * ---------------------------------------------------------------------- */

let keepAlive: number | null = null;

export function startKeepAlive() {
  if (!supported() || keepAlive !== null) return;
  const isChromeDesktop =
    /Chrome/.test(navigator.userAgent) && !/Mobile|Android/.test(navigator.userAgent);
  if (!isChromeDesktop) return;
  keepAlive = window.setInterval(() => {
    const s = window.speechSynthesis;
    if (s.speaking && !s.paused) {
      s.pause();
      s.resume();
    }
  }, 10000);
}

export function stopKeepAlive() {
  if (keepAlive !== null) {
    window.clearInterval(keepAlive);
    keepAlive = null;
  }
}

/* -------------------------------------------------------------------------
 * iOS warm-up — Safari will not speak unless primed inside a user gesture
 * ---------------------------------------------------------------------- */

let warmed = false;

export function warmUp() {
  if (!supported() || warmed) return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  window.speechSynthesis.speak(u);
  warmed = true;
}

/** Build a configured utterance. Returns null when the language has no voice. */
export function makeUtterance(
  text: string,
  resolved: ResolvedVoice,
  rate = 0.9,
): SpeechSynthesisUtterance | null {
  if (!resolved.voice) return null;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = resolved.voice;          // the line that actually controls pronunciation
  u.lang = resolved.voice.lang;
  u.rate = rate;
  u.pitch = 1;
  return u;
}

/** Console diagnostic: run on each target device to see real voice coverage. */
export async function voiceReport() {
  const rows = [];
  for (const code of Object.keys(LANG_BCP47) as LanguageCode[]) {
    const r = await resolveVoice(code);
    rows.push({
      code,
      bcp47: r.lang,
      match: r.match,
      voice: r.voice?.name ?? '—',
      local: r.voice?.localService ?? '—',
    });
  }
  console.table(rows);
  return rows;
}
