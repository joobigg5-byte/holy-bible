import type { LanguageCode } from '@/data/languages';
import { getCachedChapter, setCachedChapter, countCachedBooks } from './bibleCache';
import { BIBLE_BOOKS, POPULAR_BOOKS } from '@/data/bibleBooks';

const LOCAL_BIBLE_FOLDERS: Partial<Record<LanguageCode, string>> = {
  kjv: 'en_kjv',
  twi: 'twi_akuapem',
  yor: 'yoruba',
  swa: 'swahili',
  zul: 'zulu',
  svd: 'arabic',
  chi: 'chinese_cuv',
  hin: 'hindi',
  rus: 'russian_synodal',
  it:  'italian',
  de:  'german',
  ja:  'japanese',
  lsg: 'french_lsg',
  rv1960: 'spanish_rv1960',
  jfa: 'portuguese_jfa',
  nld: 'dutch',
  kor: 'korean',
};

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// USFM footnote and cross-reference spans carry translator's notes that were
// never meant to be read as scripture. The old cleaner stripped the backslash
// markers but left the note text behind, so Twi verses appeared with
// "+ 2.1 Twam Afahyɛ..." embedded mid-sentence. Drop the whole span.
const cleanText = (s: string) =>
  s
    .replace(/\\+[fx]\s[\s\S]*?\\+[fx]\*/g, '')
    .replace(/\\+[a-zA-Z]+\*?/g, ' ')
    .replace(/\\/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

export type Chapter = Record<string, string>;
export type FetchSource = 'cache' | 'offline';

export interface ChapterResult {
  chapter: Chapter;
  source: FetchSource;
  fellBackToEnglish: boolean;
}

async function loadLocalChapter(
  translation: LanguageCode,
  book: string,
  chapter: number,
): Promise<Chapter | null> {
  const folder = LOCAL_BIBLE_FOLDERS[translation];
  if (!folder) return null;
  try {
    const bookSlug = book.toLowerCase().replace(/ /g, '_');
    const resp = await fetch(`/bibles/${folder}/${bookSlug}.json`);
    if (!resp.ok) return null;
    const bookData = await resp.json();
    const chapterData = bookData[String(chapter)] as Record<string, string> | undefined;
    if (!chapterData) return null;
    for (const [v, text] of Object.entries(chapterData)) {
      chapterData[v] = cleanText(stripHtml(text));
    }
    return chapterData;
  } catch {
    return null;
  }
}

export async function loadChapter(
  translation: LanguageCode,
  book: string,
  chapter: number,
): Promise<ChapterResult> {
  const cached = await getCachedChapter(translation, book, chapter);
  if (cached) return { chapter: cached, source: 'cache', fellBackToEnglish: false };

  const local = await loadLocalChapter(translation, book, chapter);
  if (local) {
    await setCachedChapter(translation, book, chapter, local);
    return { chapter: local, source: 'offline', fellBackToEnglish: false };
  }

  // Final fallback to KJV (offline)
  if (translation !== 'kjv') {
    const enLocal = await loadLocalChapter('kjv', book, chapter);
    if (enLocal) {
      await setCachedChapter('kjv', book, chapter, enLocal);
      return { chapter: enLocal, source: 'offline', fellBackToEnglish: true };
    }
  }

  return { chapter: {}, source: 'offline', fellBackToEnglish: true };
}

export async function preloadPopularBooks(
  translation: LanguageCode,
  onProgress?: (loaded: number, total: number) => void,
) {
  const total = POPULAR_BOOKS.length;
  let loaded = 0;
  for (const book of POPULAR_BOOKS) {
    await loadChapter(translation, book, 1).catch(() => undefined);
    loaded += 1;
    onProgress?.(loaded, total);
  }
}

export async function getCachedBookCount(translation: LanguageCode): Promise<number> {
  const set = await countCachedBooks(translation);
  let n = 0;
  for (const b of BIBLE_BOOKS) if (set.has(b.name)) n += 1;
  return n;
}

export async function fetchVerseText(
  translation: LanguageCode,
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd?: number,
): Promise<string | null> {
  const result = await loadChapter(translation, book, chapter);
  if (!result.chapter) return null;
  let text = '';
  const end = verseEnd ?? verseStart;
  for (let v = verseStart; v <= end; v++) {
    const vs = result.chapter[String(v)];
    if (vs) text += (text ? ' ' : '') + vs;
  }
  return text || null;
}