/**
 * Reading plans.
 *
 * Computed rather than stored: each plan is a rule that produces the readings
 * for day N, so there is no data file and no maintenance. Progress is a single
 * number per plan.
 */

export interface Reading {
  book: string;
  fromChapter: number;
  toChapter: number;
}

export interface Plan {
  id: string;
  name: string;
  note: string;
  days: number;
  readingsFor: (day: number) => Reading[];
}

const OT = [
  ['Genesis',50],['Exodus',40],['Leviticus',27],['Numbers',36],['Deuteronomy',34],
  ['Joshua',24],['Judges',21],['Ruth',4],['1 Samuel',31],['2 Samuel',24],['1 Kings',22],
  ['2 Kings',25],['1 Chronicles',29],['2 Chronicles',36],['Ezra',10],['Nehemiah',13],
  ['Esther',10],['Job',42],['Psalms',150],['Proverbs',31],['Ecclesiastes',12],
  ['Song of Solomon',8],['Isaiah',66],['Jeremiah',52],['Lamentations',5],['Ezekiel',48],
  ['Daniel',12],['Hosea',14],['Joel',3],['Amos',9],['Obadiah',1],['Jonah',4],['Micah',7],
  ['Nahum',3],['Habakkuk',3],['Zephaniah',3],['Haggai',2],['Zechariah',14],['Malachi',4],
] as const;

const NT = [
  ['Matthew',28],['Mark',16],['Luke',24],['John',21],['Acts',28],['Romans',16],
  ['1 Corinthians',16],['2 Corinthians',13],['Galatians',6],['Ephesians',6],
  ['Philippians',4],['Colossians',4],['1 Thessalonians',5],['2 Thessalonians',3],
  ['1 Timothy',6],['2 Timothy',4],['Titus',3],['Philemon',1],['Hebrews',13],['James',5],
  ['1 Peter',5],['2 Peter',3],['1 John',5],['2 John',1],['3 John',1],['Jude',1],
  ['Revelation',22],
] as const;

/** Flatten a book list into a single sequence of chapters. */
function sequence(books: readonly (readonly [string, number])[]): Array<[string, number]> {
  const out: Array<[string, number]> = [];
  for (const [book, count] of books) {
    for (let c = 1; c <= count; c++) out.push([book, c]);
  }
  return out;
}

/**
 * Take a day's chapters and group them by book.
 *
 * Spread proportionally rather than a fixed number per day. A fixed count
 * rounds up and finishes the plan early — the year plan ended on day 298 and
 * left 67 empty days at the end.
 */
function slice(seq: Array<[string, number]>, day: number, totalDays: number): Reading[] {
  const start = Math.floor(((day - 1) * seq.length) / totalDays);
  const end = Math.floor((day * seq.length) / totalDays);
  const chunk = seq.slice(start, end);
  const out: Reading[] = [];
  for (const [book, chapter] of chunk) {
    const last = out[out.length - 1];
    if (last && last.book === book && last.toChapter === chapter - 1) last.toChapter = chapter;
    else out.push({ book, fromChapter: chapter, toChapter: chapter });
  }
  return out;
}

const ALL = sequence([...OT, ...NT]);
const NT_SEQ = sequence(NT);
const WISDOM = sequence([['Psalms', 150], ['Proverbs', 31]] as const);
const GOSPELS = sequence([['Matthew',28],['Mark',16],['Luke',24],['John',21]] as const);

export const PLANS: Plan[] = [
  {
    id: 'year',
    name: 'The whole Bible in a year',
    note: '1,189 chapters · about three or four a day',
    days: 365,
    readingsFor: (d) => slice(ALL, d, 365),
  },
  {
    id: 'nt90',
    name: 'New Testament in 90 days',
    note: '260 chapters · about three a day',
    days: 90,
    readingsFor: (d) => slice(NT_SEQ, d, 90),
  },
  {
    id: 'gospels',
    name: 'The four Gospels',
    note: '89 chapters · one a day for three months',
    days: 89,
    readingsFor: (d) => slice(GOSPELS, d, 89),
  },
  {
    id: 'wisdom',
    name: 'Psalms and Proverbs',
    note: '181 chapters · one a day, six months',
    days: 181,
    readingsFor: (d) => slice(WISDOM, d, 181),
  },
];

/* ------------------------------------------------------------- progress */

const KEY = 'aihb_plan';

export interface PlanState {
  planId: string;
  /** Day the reader is on, from 1. */
  day: number;
  startedAt: string;
}

export function getPlanState(): PlanState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlanState) : null;
  } catch {
    return null;
  }
}

export function startPlan(planId: string): PlanState {
  const state: PlanState = { planId, day: 1, startedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(state));
  return state;
}

export function advancePlan(): PlanState | null {
  const s = getPlanState();
  if (!s) return null;
  const plan = PLANS.find((p) => p.id === s.planId);
  const next = { ...s, day: Math.min(s.day + 1, plan?.days ?? s.day + 1) };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function setPlanDay(day: number): PlanState | null {
  const s = getPlanState();
  if (!s) return null;
  const next = { ...s, day: Math.max(1, day) };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function stopPlan() {
  localStorage.removeItem(KEY);
}

export function formatReading(r: Reading): string {
  const book = r.book === 'Psalms' ? 'Psalm' : r.book;
  return r.fromChapter === r.toChapter
    ? `${book} ${r.fromChapter}`
    : `${book} ${r.fromChapter}–${r.toChapter}`;
}
