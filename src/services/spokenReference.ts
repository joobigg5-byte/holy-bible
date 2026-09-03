/**
 * Find scripture references inside spoken text.
 *
 * A preacher says "turn with me to Romans chapter eight verse twenty-eight" or
 * just "Romans eight twenty-eight". Speech recognition returns that as words,
 * with numbers usually spelled out, so the reference has to be recovered from
 * ordinary prose rather than matched as a tidy string.
 */

const BOOKS: Array<[string, string[]]> = [
  ['Genesis', ['genesis', 'gen']],
  ['Exodus', ['exodus', 'exodous', 'exo']],
  ['Leviticus', ['leviticus', 'levicticus']],
  ['Numbers', ['numbers']],
  ['Deuteronomy', ['deuteronomy', 'deuteronomy', 'deut']],
  ['Joshua', ['joshua']],
  ['Judges', ['judges']],
  ['Ruth', ['ruth']],
  ['1 Samuel', ['first samuel', 'one samuel', '1 samuel', 'first sam']],
  ['2 Samuel', ['second samuel', 'two samuel', '2 samuel', 'second sam']],
  ['1 Kings', ['first kings', 'one kings', '1 kings']],
  ['2 Kings', ['second kings', 'two kings', '2 kings']],
  ['1 Chronicles', ['first chronicles', 'one chronicles', '1 chronicles']],
  ['2 Chronicles', ['second chronicles', 'two chronicles', '2 chronicles']],
  ['Ezra', ['ezra']],
  ['Nehemiah', ['nehemiah']],
  ['Esther', ['esther']],
  ['Job', ['job']],
  ['Psalms', ['psalms', 'psalm', 'salms', 'sam']],
  ['Proverbs', ['proverbs', 'proverb']],
  ['Ecclesiastes', ['ecclesiastes']],
  ['Song of Solomon', ['song of solomon', 'song of songs', 'canticles']],
  ['Isaiah', ['isaiah', 'esaias']],
  ['Jeremiah', ['jeremiah']],
  ['Lamentations', ['lamentations']],
  ['Ezekiel', ['ezekiel']],
  ['Daniel', ['daniel']],
  ['Hosea', ['hosea']],
  ['Joel', ['joel']],
  ['Amos', ['amos']],
  ['Obadiah', ['obadiah']],
  ['Jonah', ['jonah']],
  ['Micah', ['micah']],
  ['Nahum', ['nahum']],
  ['Habakkuk', ['habakkuk']],
  ['Zephaniah', ['zephaniah']],
  ['Haggai', ['haggai']],
  ['Zechariah', ['zechariah']],
  ['Malachi', ['malachi']],
  ['Matthew', ['matthew', 'mathew', 'saint matthew']],
  ['Mark', ['mark', 'saint mark']],
  ['Luke', ['luke', 'saint luke']],
  ['John', ['john', 'saint john']],
  ['Acts', ['acts', 'the acts', 'book of acts']],
  ['Romans', ['romans', 'roman']],
  ['1 Corinthians', ['first corinthians', 'one corinthians', '1 corinthians']],
  ['2 Corinthians', ['second corinthians', 'two corinthians', '2 corinthians']],
  ['Galatians', ['galatians']],
  ['Ephesians', ['ephesians']],
  ['Philippians', ['philippians', 'philipians']],
  ['Colossians', ['colossians']],
  ['1 Thessalonians', ['first thessalonians', 'one thessalonians', '1 thessalonians']],
  ['2 Thessalonians', ['second thessalonians', 'two thessalonians', '2 thessalonians']],
  ['1 Timothy', ['first timothy', 'one timothy', '1 timothy']],
  ['2 Timothy', ['second timothy', 'two timothy', '2 timothy']],
  ['Titus', ['titus']],
  ['Philemon', ['philemon']],
  ['Hebrews', ['hebrews', 'hebrew']],
  ['James', ['james']],
  ['1 Peter', ['first peter', 'one peter', '1 peter']],
  ['2 Peter', ['second peter', 'two peter', '2 peter']],
  ['1 John', ['first john', 'one john', '1 john']],
  ['2 John', ['second john', 'two john', '2 john']],
  ['3 John', ['third john', 'three john', '3 john']],
  ['Jude', ['jude']],
  ['Revelation', ['revelation', 'revelations', 'the revelation', 'apocalypse']],
];

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
  fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
  twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60,
  seventieth: 70, eightieth: 80, ninetieth: 90,
};

/**
 * Turn number words into digits, in place.
 * "chapter eight verse twenty eight" -> "chapter 8 verse 28"
 */
export function numeralise(text: string): string {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let i = 0;
  while (i < words.length) {
    const w = words[i].toLowerCase().replace(/[^a-z]/g, '');
    const hyphen = words[i].toLowerCase().split('-');

    // "twenty-eight" arrives as a single hyphenated token
    if (hyphen.length === 2 && TENS[hyphen[0]] !== undefined && UNITS[hyphen[1]] !== undefined) {
      out.push(String(TENS[hyphen[0]] + UNITS[hyphen[1]]));
      i += 1;
      continue;
    }
    if (TENS[w] !== undefined) {
      const next = (words[i + 1] ?? '').toLowerCase().replace(/[^a-z]/g, '');
      if (UNITS[next] !== undefined && UNITS[next] < 10) {
        out.push(String(TENS[w] + UNITS[next]));
        i += 2;
        continue;
      }
      out.push(String(TENS[w]));
      i += 1;
      continue;
    }
    if (UNITS[w] !== undefined) {
      // "first john" is a book, not the number one
      const next = (words[i + 1] ?? '').toLowerCase().replace(/[^a-z]/g, '');
      const isBookPrefix =
        UNITS[w] <= 3 &&
        ['john', 'peter', 'samuel', 'kings', 'chronicles', 'corinthians',
         'thessalonians', 'timothy'].includes(next);
      out.push(isBookPrefix ? words[i] : String(UNITS[w]));
      i += 1;
      continue;
    }
    out.push(words[i]);
    i += 1;
  }
  return out.join(' ');
}

export interface SpokenRef {
  book: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  /** The words this was recovered from, for showing what was heard. */
  heard: string;
}

/** Books of a single chapter, where "verse four" means 1:4. */
const SINGLE_CHAPTER = new Set(['Obadiah', 'Philemon', '2 John', '3 John', 'Jude']);

const CHAPTER_LIMITS: Record<string, number> = {
  Psalms: 150, Isaiah: 66, Jeremiah: 52, Genesis: 50, Ezekiel: 48, Job: 42,
  Exodus: 40, '2 Chronicles': 36, Numbers: 36, Deuteronomy: 34, '1 Samuel': 31,
  Proverbs: 31, Leviticus: 27, Matthew: 28, Acts: 28, Revelation: 22, John: 21,
};

/**
 * Scan a stretch of speech and return every reference found.
 * Returns them in the order they were spoken; the last is usually the live one.
 */
export function findReferences(text: string): SpokenRef[] {
  const flat = numeralise(text.toLowerCase()).replace(/[,;]/g, ' ');
  const found: SpokenRef[] = [];

  for (const [name, aliases] of BOOKS) {
    for (const alias of aliases) {
      let from = 0;
      for (;;) {
        const at = flat.indexOf(alias, from);
        if (at === -1) break;
        from = at + alias.length;

        // Must be a whole word
        const before = at === 0 ? ' ' : flat[at - 1];
        const after = flat[from] ?? ' ';
        if (/[a-z]/.test(before) || /[a-z]/.test(after)) continue;

        // Look just past the name for "chapter N verse M", "N:M", or "N M".
        // Whitespace is consumed around the optional keyword rather than as
        // part of it, or "8 verse 28" loses the verse.
        const tail = flat.slice(from, from + 48);

        let chapter: number;
        let verseStr: string | undefined;
        let endStr: string | undefined;
        let heardTail: string;

        if (SINGLE_CHAPTER.has(name)) {
          // Obadiah, Philemon, 2 and 3 John, Jude — "verse four" means 1:4
          const one = tail.match(
            /^\s*(?:chapter\s+1\s+)?(?:verses?\s+)?(\d{1,3})(?:\s*(?:-|to|through)\s*(\d{1,3}))?/);
          if (!one) continue;
          chapter = 1;
          verseStr = one[1];
          endStr = one[2];
          heardTail = one[0];
        } else {
          const m = tail.match(
            /^\s*(?:chapter\s+)?(\d{1,3})\s*(?::|\s*verses?\s+)?\s*(\d{1,3})?(?:\s*(?:-|to|through)\s*(\d{1,3}))?/);
          if (!m || !m[1]) continue;
          chapter = Number(m[1]);
          verseStr = m[2];
          endStr = m[3];
          heardTail = m[0];
        }

        const limit = CHAPTER_LIMITS[name];
        if (chapter < 1 || (limit && chapter > limit)) continue;

        found.push({
          book: name,
          chapter,
          verse: verseStr ? Number(verseStr) : undefined,
          verseEnd: endStr ? Number(endStr) : undefined,
          heard: `${alias}${heardTail}`.trim(),
        });
      }
    }
  }

  // Longest alias wins where two overlap, e.g. "first john" over "john"
  found.sort((a, b) => b.heard.length - a.heard.length);
  const seen = new Set<string>();
  return found.filter((r) => {
    const key = `${r.book}|${r.chapter}|${r.verse ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatRef(r: SpokenRef): string {
  const book = r.book === 'Psalms' ? 'Psalm' : r.book;
  // Single-chapter books are cited without the chapter: "Jude 3", not "Jude 1:3"
  const solo = SINGLE_CHAPTER.has(r.book);
  if (r.verse === undefined) return `${book} ${r.chapter}`;
  const nums = r.verseEnd ? `${r.verse}-${r.verseEnd}` : `${r.verse}`;
  return solo ? `${book} ${nums}` : `${book} ${r.chapter}:${nums}`;
}
