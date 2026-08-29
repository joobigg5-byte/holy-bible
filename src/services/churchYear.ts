/**
 * The church year.
 *
 * Entirely computed — no data file, no network, no maintenance. Everything
 * hangs off Easter, which is found with the anonymous Gregorian algorithm
 * (Meeus/Jones/Butcher). Advent hangs off Christmas.
 *
 * Deliberately ecumenical and light-touch: the seasons here are the ones
 * nearly every tradition keeps. Watch Night is included because it matters
 * enormously in African and African-diaspora churches and is missing from most
 * Western liturgical calendars.
 */

export type SeasonId =
  | 'advent' | 'christmas' | 'epiphany' | 'lent' | 'holy-week'
  | 'easter' | 'pentecost' | 'ordinary';

export interface Season {
  id: SeasonId;
  name: string;
  /** One line for the app to show. */
  note: string;
  /** Themes to bias the lectionary and hymn selection toward. */
  themes: string[];
}

export interface DayInfo {
  season: Season;
  /** A named day, when today is one. */
  feast?: string;
  /** Day number within the season, from 1. */
  dayOfSeason: number;
  /** Days until the season's defining feast, when there is one ahead. */
  daysUntil?: { name: string; days: number };
}

const SEASONS: Record<SeasonId, Season> = {
  advent: { id: 'advent', name: 'Advent', themes: ['hope', 'waiting', 'prophecy', 'light'],
    note: 'The season of waiting before Christmas.' },
  christmas: { id: 'christmas', name: 'Christmastide', themes: ['joy', 'incarnation', 'praise'],
    note: 'The twelve days from Christmas to Epiphany.' },
  epiphany: { id: 'epiphany', name: 'Epiphany', themes: ['light', 'revelation', 'mission'],
    note: 'The showing of Christ to the nations.' },
  lent: { id: 'lent', name: 'Lent', themes: ['repentance', 'fasting', 'humility', 'prayer'],
    note: 'Forty days of preparation before Easter.' },
  'holy-week': { id: 'holy-week', name: 'Holy Week', themes: ['cross', 'suffering', 'sacrifice'],
    note: 'The week of the Passion.' },
  easter: { id: 'easter', name: 'Eastertide', themes: ['resurrection', 'joy', 'victory', 'praise'],
    note: 'Fifty days of resurrection.' },
  pentecost: { id: 'pentecost', name: 'Pentecost', themes: ['spirit', 'power', 'mission', 'church'],
    note: 'The coming of the Holy Spirit.' },
  ordinary: { id: 'ordinary', name: 'Ordinary Time', themes: ['faith', 'guidance', 'growth'],
    note: 'The long season of growth.' },
};

const DAY = 86_400_000;
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
const startOfDay = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
const daysBetween = (a: number, b: number) => Math.round((b - a) / DAY);

/** Anonymous Gregorian algorithm. Returns Easter Sunday for a given year. */
export function easterSunday(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

/** First Sunday of Advent: the fourth Sunday before Christmas Day. */
export function adventStart(year: number): number {
  const christmas = utc(year, 12, 25);
  const dow = new Date(christmas).getUTCDay(); // 0 = Sunday
  const fourthSundayBefore = christmas - (dow === 0 ? 28 : 21 + dow) * DAY;
  return fourthSundayBefore;
}

interface Anchor {
  name: string;
  at: number;
}

function anchorsFor(year: number) {
  const easter = easterSunday(year);
  return {
    easter,
    ashWednesday: easter - 46 * DAY,
    palmSunday: easter - 7 * DAY,
    maundyThursday: easter - 3 * DAY,
    goodFriday: easter - 2 * DAY,
    ascension: easter + 39 * DAY,
    pentecost: easter + 49 * DAY,
    advent: adventStart(year),
    christmas: utc(year, 12, 25),
    epiphany: utc(year, 1, 6),
    watchNight: utc(year, 12, 31),
  };
}

const FEASTS: Array<[keyof ReturnType<typeof anchorsFor>, string]> = [
  ['ashWednesday', 'Ash Wednesday'],
  ['palmSunday', 'Palm Sunday'],
  ['maundyThursday', 'Maundy Thursday'],
  ['goodFriday', 'Good Friday'],
  ['easter', 'Easter Sunday'],
  ['ascension', 'Ascension Day'],
  ['pentecost', 'Pentecost'],
  ['christmas', 'Christmas Day'],
  ['epiphany', 'Epiphany'],
  ['watchNight', 'Watch Night'],
];

export function getDayInfo(date: Date = new Date()): DayInfo {
  const today = startOfDay(date);
  const year = new Date(today).getUTCFullYear();
  const a = anchorsFor(year);

  const feast = FEASTS.find(([key]) => a[key] === today)?.[1];

  let season: Season;
  let seasonStart: number;
  let ahead: Anchor | undefined;

  if (today >= a.advent && today < a.christmas) {
    season = SEASONS.advent;
    seasonStart = a.advent;
    ahead = { name: 'Christmas', at: a.christmas };
  } else if (today >= a.christmas || today < a.epiphany) {
    season = SEASONS.christmas;
    // Christmastide straddles the new year
    seasonStart = today >= a.christmas ? a.christmas : utc(year - 1, 12, 25);
  } else if (today >= a.epiphany && today < a.ashWednesday) {
    season = SEASONS.epiphany;
    seasonStart = a.epiphany;
    ahead = { name: 'Ash Wednesday', at: a.ashWednesday };
  } else if (today >= a.ashWednesday && today < a.palmSunday) {
    season = SEASONS.lent;
    seasonStart = a.ashWednesday;
    ahead = { name: 'Easter', at: a.easter };
  } else if (today >= a.palmSunday && today < a.easter) {
    season = SEASONS['holy-week'];
    seasonStart = a.palmSunday;
    ahead = { name: 'Easter', at: a.easter };
  } else if (today >= a.easter && today < a.pentecost) {
    season = SEASONS.easter;
    seasonStart = a.easter;
    ahead = { name: 'Pentecost', at: a.pentecost };
  } else if (today === a.pentecost) {
    season = SEASONS.pentecost;
    seasonStart = a.pentecost;
  } else {
    season = SEASONS.ordinary;
    seasonStart = a.pentecost + DAY;
    ahead = { name: 'Advent', at: a.advent };
  }

  const info: DayInfo = {
    season,
    dayOfSeason: daysBetween(seasonStart, today) + 1,
  };
  if (feast) info.feast = feast;
  if (ahead && ahead.at > today) {
    info.daysUntil = { name: ahead.name, days: daysBetween(today, ahead.at) };
  }
  return info;
}

/** Key dates for a year, for a calendar view. */
export function keyDates(year: number): Array<{ name: string; date: Date }> {
  const a = anchorsFor(year);
  return [
    { name: 'Epiphany', date: new Date(a.epiphany) },
    { name: 'Ash Wednesday', date: new Date(a.ashWednesday) },
    { name: 'Palm Sunday', date: new Date(a.palmSunday) },
    { name: 'Maundy Thursday', date: new Date(a.maundyThursday) },
    { name: 'Good Friday', date: new Date(a.goodFriday) },
    { name: 'Easter Sunday', date: new Date(a.easter) },
    { name: 'Ascension Day', date: new Date(a.ascension) },
    { name: 'Pentecost', date: new Date(a.pentecost) },
    { name: 'First Sunday of Advent', date: new Date(a.advent) },
    { name: 'Christmas Day', date: new Date(a.christmas) },
    { name: 'Watch Night', date: new Date(a.watchNight) },
  ];
}
