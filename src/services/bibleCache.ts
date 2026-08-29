/**
 * IndexedDB cache for full Bible chapters.
 * Key: `${translation}:${book}:${chapter}` → Record<verseNum, text>
 */
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'ai-holy-bible';
const STORE = 'chapters';
const VERSION = 1;

type Chapter = Record<string, string>;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

const key = (translation: string, book: string, chapter: number) =>
  `${translation}:${book}:${chapter}`;

export async function getCachedChapter(
  translation: string,
  book: string,
  chapter: number,
): Promise<Chapter | null> {
  try {
    const db = await getDb();
    return (await db.get(STORE, key(translation, book, chapter))) ?? null;
  } catch {
    return null;
  }
}

export async function setCachedChapter(
  translation: string,
  book: string,
  chapter: number,
  data: Chapter,
): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE, data, key(translation, book, chapter));
  } catch {
    /* quota / private mode — ignore */
  }
}

export async function hasCachedChapter(
  translation: string,
  book: string,
  chapter: number,
): Promise<boolean> {
  const db = await getDb();
  const v = await db.getKey(STORE, key(translation, book, chapter));
  return v !== undefined;
}

export async function countCachedBooks(translation: string): Promise<Set<string>> {
  const db = await getDb();
  const keys = (await db.getAllKeys(STORE)) as string[];
  const books = new Set<string>();
  for (const k of keys) {
    const [t, b] = k.split(':');
    if (t === translation) books.add(b);
  }
  return books;
}
