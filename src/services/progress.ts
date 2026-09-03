/**
 * Reading progress and history.
 *
 * The data was already being collected — chapters read, streak, last visit —
 * but there was nowhere to see it. This reads what exists and adds a per-chapter
 * log so a reader can look back over a month and see what they actually did.
 *
 * Device only, like everything else here.
 */

const LOG_KEY = 'aihb_reading_log';
const STREAK_KEY = 'aihb_streak';

export interface LogEntry {
  /** ISO date, day resolution. */
  date: string;
  book: string;
  chapter: number;
  language: string;
}

const BOOK_CHAPTERS: Record<string, number> = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34, Joshua: 24,
  Judges: 21, Ruth: 4, '1 Samuel': 31, '2 Samuel': 24, '1 Kings': 22, '2 Kings': 25,
  '1 Chronicles': 29, '2 Chronicles': 36, Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42,
  Psalms: 150, Proverbs: 31, Ecclesiastes: 12, 'Song of Solomon': 8, Isaiah: 66,
  Jeremiah: 52, Lamentations: 5, Ezekiel: 48, Daniel: 12, Hosea: 14, Joel: 3, Amos: 9,
  Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3, Habakkuk: 3, Zephaniah: 3, Haggai: 2,
  Zechariah: 14, Malachi: 4, Matthew: 28, Mark: 16, Luke: 24, John: 21, Acts: 28,
  Romans: 16, '1 Corinthians': 16, '2 Corinthians': 13, Galatians: 6, Ephesians: 6,
  Philippians: 4, Colossians: 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, Titus: 3, Philemon: 1, Hebrews: 13, James: 5,
  '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1,
  Revelation: 22,
};

const TOTAL_CHAPTERS = Object.values(BOOK_CHAPTERS).reduce((a, b) => a + b, 0); // 1189

function read(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as LogEntry[];
  } catch {
    return [];
  }
}

/** Called when a chapter is opened. Same chapter on the same day counts once. */
export function logChapter(book: string, chapter: number, language: string) {
  const date = new Date().toISOString().slice(0, 10);
  const log = read();
  if (log.some((e) => e.date === date && e.book === book && e.chapter === chapter)) return;
  log.unshift({ date, book, chapter, language });
  // A couple of years of daily reading, then trimmed
  localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 2000)));
}

export function getLog(): LogEntry[] {
  return read();
}

export interface Summary {
  streak: number;
  chaptersRead: number;
  uniqueChapters: number;
  percentOfBible: number;
  booksStarted: number;
  booksFinished: string[];
  daysRead: number;
  thisWeek: number;
  languages: string[];
}

export function getSummary(): Summary {
  const log = read();
  const unique = new Set(log.map((e) => `${e.book}|${e.chapter}`));

  const byBook = new Map<string, Set<number>>();
  for (const e of log) {
    if (!byBook.has(e.book)) byBook.set(e.book, new Set());
    byBook.get(e.book)!.add(e.chapter);
  }

  const finished = [...byBook.entries()]
    .filter(([book, ch]) => BOOK_CHAPTERS[book] && ch.size >= BOOK_CHAPTERS[book])
    .map(([book]) => book);

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const streakRaw = Number(localStorage.getItem(STREAK_KEY) ?? '0');

  return {
    streak: Number.isFinite(streakRaw) ? streakRaw : 0,
    chaptersRead: log.length,
    uniqueChapters: unique.size,
    percentOfBible: Math.round((unique.size / TOTAL_CHAPTERS) * 1000) / 10,
    booksStarted: byBook.size,
    booksFinished: finished,
    daysRead: new Set(log.map((e) => e.date)).size,
    thisWeek: log.filter((e) => e.date >= weekAgo).length,
    languages: [...new Set(log.map((e) => e.language))],
  };
}

/** Chapters read per book, for a progress list. */
export function bookProgress(): Array<{ book: string; read: number; total: number }> {
  const log = read();
  const byBook = new Map<string, Set<number>>();
  for (const e of log) {
    if (!byBook.has(e.book)) byBook.set(e.book, new Set());
    byBook.get(e.book)!.add(e.chapter);
  }
  return [...byBook.entries()]
    .map(([book, ch]) => ({ book, read: ch.size, total: BOOK_CHAPTERS[book] ?? ch.size }))
    .sort((a, b) => b.read / b.total - a.read / a.total);
}

/** Last 12 weeks as a simple grid, for a calendar strip. */
export function recentDays(days = 84): Array<{ date: string; count: number }> {
  const log = read();
  const counts = new Map<string, number>();
  for (const e of log) counts.set(e.date, (counts.get(e.date) ?? 0) + 1);

  const out: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date: d, count: counts.get(d) ?? 0 });
  }
  return out;
}

export function clearLog() {
  localStorage.removeItem(LOG_KEY);
}
