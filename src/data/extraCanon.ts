/**
 * Writings outside the 66-book canon.
 *
 * Kept deliberately separate from BIBLE_BOOKS. These are read by many people
 * and valued by several traditions, but their canonical status differs by
 * tradition and the app should not blur that line:
 *
 *   - The Apocrypha/deuterocanon is canonical for Catholic and Orthodox
 *     readers, and was printed in the 1611 KJV, but is not canonical for most
 *     Protestants.
 *   - 1 Enoch and Jubilees are canonical in the Ethiopian Orthodox Tewahedo
 *     church and nowhere else.
 *   - Jasher, Adam and Eve, the Testaments, and the Odes are canonical in no
 *     tradition. They are read as ancient literature.
 *
 * Surface these under their own heading with the note text below visible.
 * Never merge them into the main book list.
 */

export interface ExtraWork {
  name: string;
  slug: string;
  chapters: number;
  verses: number;
  attribution: string;
  /** Set when the work is one part of a larger collection. */
  collection?: string | null;
}

export interface ExtraCollection {
  id: 'apocrypha' | 'ancient';
  title: string;
  folder: string;
  /** Shown at the top of the section. Do not hide this. */
  note: string;
  indexUrl: string;
}

export const EXTRA_COLLECTIONS: ExtraCollection[] = [
  {
    id: 'apocrypha',
    title: 'The Apocrypha',
    folder: 'apocrypha_kjv',
    note:
      'Included in the 1611 King James Bible and canonical for Catholic and ' +
      'Orthodox readers. Most Protestant traditions read these as valuable ' +
      'but not scripture.',
    indexUrl: '/bibles/apocrypha_kjv/_index.json',
  },
  {
    id: 'ancient',
    title: 'Ancient Writings',
    folder: 'ancient_texts',
    note:
      'Outside the canon of nearly every tradition. 1 Enoch and Jubilees are ' +
      'scripture in the Ethiopian Orthodox Tewahedo church; the rest are read ' +
      'as ancient literature, not as scripture.',
    indexUrl: '/bibles/ancient_texts/_index.json',
  },
];

const cache = new Map<string, ExtraWork[]>();

export async function loadCollection(c: ExtraCollection): Promise<ExtraWork[]> {
  const hit = cache.get(c.id);
  if (hit) return hit;
  try {
    const res = await fetch(c.indexUrl);
    if (!res.ok) return [];
    const works = (await res.json()) as ExtraWork[];
    cache.set(c.id, works);
    return works;
  } catch {
    return [];
  }
}

export type ExtraChapter = Record<string, string>;

/** Load one chapter of an extra work. English only — these aren't translated. */
export async function loadExtraChapter(
  folder: string,
  slug: string,
  chapter: number,
): Promise<ExtraChapter> {
  try {
    const res = await fetch(`/bibles/${folder}/${slug}.json`);
    if (!res.ok) return {};
    const book = (await res.json()) as Record<string, ExtraChapter>;
    return book[String(chapter)] ?? {};
  } catch {
    return {};
  }
}
