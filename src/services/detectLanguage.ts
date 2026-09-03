/**
 * Pick a sensible starting language from the browser.
 *
 * A reader in São Paulo, Jakarta or Seoul should not have to hunt for their own
 * language on first open. This runs once — the moment someone chooses a
 * language, their choice is stored and this is never consulted again.
 */
import { LANGUAGES, DEFAULT_LANGUAGE, type LanguageCode } from '@/data/languages';

/** BCP-47 primary subtag -> our translation code. */
const BY_TAG: Record<string, LanguageCode> = {
  en: 'kjv',
  es: 'rv1960',
  pt: 'jfa',
  fr: 'lsg',
  de: 'de',
  it: 'it',
  nl: 'nld',
  ru: 'rus',
  uk: 'rus',       // no Ukrainian text yet; Russian is the nearest available
  zh: 'chi',
  ja: 'ja',
  ko: 'kor',
  hi: 'hin',
  ar: 'svd',
  sw: 'swa',
  zu: 'zul',
  yo: 'yor',
  tw: 'twi',
  ak: 'twi',
  ee: 'twi',       // Ewe readers in Ghana are likelier to read Twi than English
};

const available = new Set(LANGUAGES.map((l) => l.code));

/** The best match for a browser tag, or null when we have nothing close. */
export function languageForTag(tag: string): LanguageCode | null {
  const primary = tag.toLowerCase().split('-')[0];
  const code = BY_TAG[primary];
  return code && available.has(code) ? code : null;
}

/**
 * Best guess for a first-time reader, from the browser's preference list.
 * Falls back to English, which is the safest default when we cannot tell.
 */
export function detectLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const tags = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean) as string[];

  for (const tag of tags) {
    const match = languageForTag(tag);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * A sensible second column for side-by-side reading.
 *
 * The pairing people actually want is their own language beside a language they
 * are learning — usually English, or their mother tongue if they read in
 * English. Never returns the same language twice, which would show two
 * identical columns.
 */
export function suggestSecondLanguage(primary: LanguageCode): LanguageCode {
  const detected = detectLanguage();

  // Reading in English: pair with their own language, if we have it
  if (primary === 'kjv') {
    return detected !== 'kjv' ? detected : 'rv1960';
  }

  // Reading in their own language: pair with English
  return 'kjv';
}
