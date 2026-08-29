/**
 * Scribe retrieval.
 *
 * Replaces the three-keyword lookup table with real search over all 31,102
 * verses. Works fully offline once /scribe-index.json is cached by the
 * service worker.
 *
 * Index is built at ship time (see script/build-scribe-index.mjs):
 *   { verses: { [id]: "Book|chapter|verse" },
 *     index:  { [token]: number[] } }
 *
 * Verse text is NOT duplicated in the index — it is read from the bundled
 * /bibles/{folder}/{book}.json files, so the Scribe answers in whatever
 * translation the reader has selected.
 */

import type { LanguageCode } from '@/data/languages';
import { fetchVerseText } from './bibleReader';

const INDEX_URL = '/scribe-index.json';

interface RawIndex {
  verses: Record<string, string>;
  index: Record<string, number[]>;
}

export interface ScribeHit {
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
  score: number;
}

const STOP = new Set(
  `a about above after again against all am an and any are as at be because been before being below
   between both but by can cannot could did do does doing down during each few for from further had has
   have having he her here hers herself him himself his how i if in into is it its itself me more most my
   myself nor of off on once only or other ought our ours ourselves out over own same she should so some
   such than that the their theirs them themselves then there these they this those through to too under
   until up very was we were what when where which while who whom why with would you your yours yourself
   unto shall thou thee thy thine ye hath doth saith said say tell know want need feel feels feeling
   felt god lord bible verse scripture please help me just really very well much many thing things
   someone something anyone anything always never today lately right now still even`.split(/\s+/),
);

/**
 * Consolation weighting. Pure word-frequency ranking surfaces whatever book
 * happens to use a word most, which is how "my father is dying" used to
 * return genealogies. Weighting toward the pastoral books returns Psalm 23.
 */
const BOOK_WEIGHT: Record<string, number> = {
  Psalms: 2.2, Isaiah: 1.7, John: 1.8, Matthew: 1.6, Luke: 1.6, Mark: 1.4,
  Romans: 1.7, Proverbs: 1.6, '2 Corinthians': 1.5, '1 Corinthians': 1.4,
  Philippians: 1.7, Hebrews: 1.5, James: 1.4, '1 Peter': 1.5, '1 John': 1.6,
  Ephesians: 1.4, Colossians: 1.3, Galatians: 1.2, Ecclesiastes: 1.3,
  Job: 1.2, Revelation: 1.2, Jeremiah: 0.8,
  // Narrative, legal and genealogical books rarely answer a pastoral question
  '1 Chronicles': 0.25, '2 Chronicles': 0.3, Numbers: 0.3, Leviticus: 0.3,
  Joshua: 0.4, Judges: 0.5, '1 Kings': 0.4, '2 Kings': 0.4, Ezra: 0.4,
  Nehemiah: 0.4, Ezekiel: 0.6, Esther: 0.5,
};

/**
 * Curated answers for the questions people actually bring. These take
 * priority; lexical search below handles everything else, so the Scribe is
 * never limited to this list.
 */
const TOPICS: Array<{ test: RegExp; refs: Array<[string, number, number]> }> = [
  { test: /\b(afraid|fear|scared|terrified|panic)\b/i,
    refs: [['Isaiah', 41, 10], ['Psalms', 27, 1], ['2 Timothy', 1, 7]] },
  { test: /\b(anxious|anxiety|worry|worried|stress|overwhelm\w*)\b/i,
    refs: [['Philippians', 4, 6], ['Matthew', 6, 34], ['1 Peter', 5, 7]] },
  { test: /\b(depress\w*|hopeless|despair|worthless|empty)\b/i,
    refs: [['Psalms', 42, 11], ['Psalms', 34, 18], ['Isaiah', 40, 31]] },
  { test: /\b(lonely|loneliness|alone|abandoned|forsaken)\b/i,
    refs: [['Deuteronomy', 31, 6], ['Psalms', 68, 6], ['Hebrews', 13, 5]] },
  { test: /\b(grief|grieving|mourn\w*|died|dying|death|funeral|loss)\b/i,
    refs: [['Psalms', 23, 4], ['Matthew', 5, 4], ['Revelation', 21, 4]] },
  { test: /\b(sick|sickness|illness|cancer|diagnos\w*|heal\w*|pain)\b/i,
    refs: [['James', 5, 15], ['Psalms', 147, 3], ['Jeremiah', 17, 14]] },
  { test: /\b(forgive\w*|forgiveness|grudge|resent\w*)\b/i,
    refs: [['Colossians', 3, 13], ['Matthew', 6, 14], ['Ephesians', 4, 32]] },
  { test: /\b(guilt|guilty|shame|ashamed|unworthy|regret)\b/i,
    refs: [['1 John', 1, 9], ['Romans', 8, 1], ['Psalms', 103, 12]] },
  { test: /\b(money|wealth|rich\w*|debt|poor|finance\w*|bills|afford)\b/i,
    refs: [['Matthew', 6, 24], ['Philippians', 4, 19], ['Proverbs', 3, 9]] },
  { test: /\b(job|work|career|unemploy\w*|fired|boss|calling)\b/i,
    refs: [['Colossians', 3, 23], ['Proverbs', 16, 3], ['Ecclesiastes', 9, 10]] },
  { test: /\b(purpose|meaning|why am i|point of life|direction)\b/i,
    refs: [['Jeremiah', 29, 11], ['Romans', 8, 28], ['Proverbs', 19, 21]] },
  { test: /\b(decide|decision|choice|choose|guidance|guide|which way)\b/i,
    refs: [['Proverbs', 3, 5], ['Psalms', 32, 8], ['James', 1, 5]] },
  { test: /\b(marriage|married|husband|wife|spouse|wedding)\b/i,
    refs: [['Ephesians', 5, 25], ['1 Corinthians', 13, 4], ['Ecclesiastes', 4, 9]] },
  { test: /\b(divorce|separat\w*|breakup|broke up|left me)\b/i,
    refs: [['Psalms', 34, 18], ['Malachi', 2, 16], ['Isaiah', 43, 18]] },
  { test: /\b(child|children|kids|son|daughter|parent\w*|raise|raising)\b/i,
    refs: [['Proverbs', 22, 6], ['Ephesians', 6, 4], ['Psalms', 127, 3]] },
  { test: /\b(addict\w*|drink\w*|drugs|porn|habit|temptation|tempted)\b/i,
    refs: [['1 Corinthians', 10, 13], ['Romans', 7, 15], ['Galatians', 5, 16]] },
  { test: /\b(angry|anger|rage|furious|hate|hatred)\b/i,
    refs: [['James', 1, 19], ['Ephesians', 4, 26], ['Proverbs', 15, 1]] },
  { test: /\b(tired|weary|exhaust\w*|burnout|burned out|rest)\b/i,
    refs: [['Matthew', 11, 28], ['Isaiah', 40, 29], ['Psalms', 23, 2]] },
  { test: /\b(doubt|unbelief|faith|believe|is god real)\b/i,
    refs: [['Mark', 9, 24], ['Hebrews', 11, 1], ['John', 20, 29]] },
  { test: /\b(betray\w*|enemy|enemies|lied|backstab\w*|friend)\b/i,
    refs: [['Psalms', 55, 12], ['Romans', 12, 19], ['Proverbs', 17, 17]] },
  { test: /\b(thank\w*|grateful|gratitude|blessed|joy|happy)\b/i,
    refs: [['1 Thessalonians', 5, 18], ['Psalms', 100, 4], ['James', 1, 17]] },
  { test: /\b(pray\w*|prayer|how do i talk to god)\b/i,
    refs: [['Matthew', 6, 9], ['Philippians', 4, 6], ['1 John', 5, 14]] },
  { test: /\b(patience|patient|wait\w*|too long|when will)\b/i,
    refs: [['Psalms', 27, 14], ['Romans', 12, 12], ['Isaiah', 40, 31]] },
  { test: /\b(pride|proud|humility|humble|arrogant)\b/i,
    refs: [['Proverbs', 16, 18], ['James', 4, 10], ['Philippians', 2, 3]] },
  { test: /\b(peace|calm|quiet|still|rest my mind)\b/i,
    refs: [['John', 14, 27], ['Philippians', 4, 7], ['Isaiah', 26, 3]] },
];

/* Very small suffix stripper — enough to bridge "fearing" -> "fear". */
function stem(w: string): string[] {
  const forms = new Set([w]);
  for (const suf of ['ing', 'edly', 'ness', 'ment', 'ful', 'ies', 'ed', 'es', 's', 'ly']) {
    if (w.length > suf.length + 2 && w.endsWith(suf)) {
      const base = w.slice(0, -suf.length);
      forms.add(base);
      if (suf === 'ies') forms.add(base + 'y');
      if (suf === 'ing' || suf === 'ed') forms.add(base + 'e');
    }
  }
  return [...forms];
}

/** Pastoral synonyms so everyday wording reaches biblical vocabulary. */
const EXPANSIONS: Record<string, string[]> = {
  anxious: ['fear', 'afraid', 'careful', 'troubled'],
  anxiety: ['fear', 'afraid', 'troubled'],
  worried: ['fear', 'afraid', 'careful', 'troubled'],
  worry: ['fear', 'afraid', 'careful'],
  scared: ['fear', 'afraid', 'dread'],
  depressed: ['sorrow', 'heavy', 'cast', 'downcast', 'mourn'],
  depression: ['sorrow', 'heavy', 'mourn', 'affliction'],
  sad: ['sorrow', 'mourn', 'weep', 'grief'],
  grief: ['mourn', 'weep', 'sorrow', 'comfort'],
  grieving: ['mourn', 'weep', 'sorrow', 'comfort'],
  lonely: ['alone', 'forsaken', 'desolate', 'comfort'],
  loneliness: ['alone', 'forsaken', 'desolate'],
  money: ['riches', 'mammon', 'treasure', 'gold', 'wealth'],
  wealth: ['riches', 'mammon', 'treasure', 'substance'],
  rich: ['riches', 'treasure', 'mammon'],
  poor: ['poverty', 'needy', 'lack'],
  job: ['work', 'labour', 'hands', 'diligent'],
  work: ['labour', 'diligent', 'hands'],
  career: ['labour', 'work', 'calling'],
  purpose: ['called', 'calling', 'ordained', 'appointed', 'counsel'],
  meaning: ['purpose', 'counsel', 'vanity'],
  guidance: ['guide', 'path', 'lead', 'direct', 'counsel'],
  decision: ['counsel', 'wisdom', 'path', 'guide'],
  marriage: ['husband', 'wife', 'wedded', 'joined'],
  divorce: ['put', 'away', 'husband', 'wife'],
  parenting: ['child', 'children', 'train', 'father', 'mother'],
  children: ['child', 'train', 'nurture'],
  forgiveness: ['forgive', 'forgiven', 'mercy', 'pardon'],
  guilt: ['sin', 'iniquity', 'transgression', 'conscience'],
  shame: ['ashamed', 'confounded', 'reproach'],
  addiction: ['bondage', 'servant', 'flesh', 'temptation'],
  temptation: ['tempted', 'tempt', 'flesh', 'lust'],
  anger: ['wrath', 'angry', 'fury', 'slow'],
  patience: ['patient', 'longsuffering', 'wait', 'endure'],
  healing: ['heal', 'healed', 'whole', 'health', 'physician'],
  sick: ['sickness', 'heal', 'infirmity', 'disease'],
  illness: ['sickness', 'infirmity', 'disease', 'heal'],
  death: ['die', 'died', 'grave', 'resurrection', 'dead'],
  dying: ['die', 'death', 'grave'],
  hope: ['hoped', 'expectation', 'trust'],
  faith: ['believe', 'believeth', 'trust', 'faithful'],
  doubt: ['unbelief', 'believe', 'wavering'],
  peace: ['rest', 'quiet', 'still'],
  strength: ['strong', 'strengthen', 'might', 'power'],
  tired: ['weary', 'faint', 'rest', 'labour'],
  exhausted: ['weary', 'faint', 'rest'],
  betrayal: ['betrayed', 'enemy', 'friend', 'deceit'],
  enemies: ['enemy', 'adversary', 'foes'],
  justice: ['judgment', 'righteous', 'oppressed'],
  gratitude: ['thanks', 'thanksgiving', 'praise', 'bless'],
  humility: ['humble', 'lowly', 'meek', 'pride'],
  pride: ['proud', 'haughty', 'lofty'],
};

let cache: RawIndex | null = null;
let loading: Promise<RawIndex | null> | null = null;

export async function loadIndex(): Promise<RawIndex | null> {
  if (cache) return cache;
  if (loading) return loading;
  loading = fetch(INDEX_URL)
    .then((r) => (r.ok ? (r.json() as Promise<RawIndex>) : null))
    .then((d) => {
      cache = d;
      return d;
    })
    .catch(() => null);
  return loading;
}

export function tokenise(query: string): string[] {
  const words = query.toLowerCase().match(/[a-z']{3,}/g) ?? [];
  const out = new Set<string>();
  for (const w of words) {
    const clean = w.replace(/'/g, '');
    if (STOP.has(clean)) continue;
    for (const f of stem(clean)) out.add(f);
    for (const e of EXPANSIONS[clean] ?? []) out.add(e);
  }
  return [...out];
}

/**
 * Search the index and return the best verses, rendered in `translation`.
 * Falls back to KJV text when the chosen translation lacks the book.
 */
export async function searchScripture(
  query: string,
  translation: LanguageCode = 'kjv',
  limit = 3,
): Promise<ScribeHit[]> {
  const hits: ScribeHit[] = [];
  const seen = new Set<string>();

  const push = async (book: string, chapter: number, verse: number, score: number) => {
    if (hits.length >= limit) return;
    const chapterKey = `${book} ${chapter}`;
    if (seen.has(chapterKey)) return;

    // Render in the reader's translation; fall back to KJV if it lacks the book
    let text = await fetchVerseText(translation, book, chapter, verse);
    if (!text && translation !== 'kjv') {
      text = await fetchVerseText('kjv', book, chapter, verse);
    }
    if (!text) return;

    seen.add(chapterKey);
    hits.push({
      book,
      chapter,
      verse,
      reference: `${book === 'Psalms' ? 'Psalm' : book} ${chapter}:${verse}`,
      text,
      score,
    });
  };

  // 1. Curated pastoral answers first
  for (const topic of TOPICS) {
    if (!topic.test.test(query)) continue;
    for (const [book, chapter, verse] of topic.refs) {
      await push(book, chapter, verse, Infinity);
    }
    if (hits.length >= limit) return hits;
  }

  // 2. Lexical search over the full text for everything else
  const idx = await loadIndex();
  if (!idx) return hits;

  const tokens = tokenise(query);
  if (!tokens.length) return hits;

  const total = Object.keys(idx.verses).length || 1;
  const scores = new Map<number, number>();

  for (const t of tokens) {
    const posting = idx.index[t];
    if (!posting?.length) continue;
    const idf = Math.log(total / posting.length); // rarer words carry more signal
    for (const id of posting) {
      scores.set(id, (scores.get(id) ?? 0) + idf);
    }
  }
  if (!scores.size) return hits;

  const ranked = [...scores.entries()]
    .map(([id, s]) => {
      const book = (idx.verses[String(id)] ?? '').split('|')[0];
      return [id, s * (BOOK_WEIGHT[book] ?? 1)] as const;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit * 8);

  for (const [id, score] of ranked) {
    if (hits.length >= limit) break;
    const loc = idx.verses[String(id)];
    if (!loc) continue;
    const [book, chStr, vStr] = loc.split('|');
    await push(book, Number(chStr), Number(vStr), score);
  }

  return hits;
}
