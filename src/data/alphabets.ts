/**
 * The Hebrew and Greek alphabets, with letter origins.
 *
 * The earliest alphabet — Proto-Sinaitic, roughly 1900–1500 BC — adapted
 * Egyptian hieroglyphs. Each sign was a picture whose name supplied its sound:
 * draw an ox, called 'alp, and the sign comes to stand for that first sound.
 * This is acrophony, and it is why 22 signs replaced hundreds of hieroglyphs.
 *
 * Important: by the time anything in the Hebrew Bible was written, the letters
 * were sound-signs. The pictures had stopped carrying meaning. There is a
 * popular teaching that a word's "true meaning" can be unlocked by combining
 * its letters' pictographic senses; mainstream Hebraists reject it, and the
 * `originNote` fields here describe history rather than endorse that method.
 *
 * Some origins are genuinely disputed. Those are marked, rather than presented
 * with false confidence.
 */

export interface HebrewLetter {
  /** Square-script form, as printed in Hebrew Bibles today. */
  letter: string;
  /** Final form, where the letter has one. */
  final?: string;
  name: string;
  /** Rough sound. */
  sound: string;
  /** Numeric value — Hebrew has no separate digits. */
  value: number;
  /** What the letter's name means. */
  meaning: string;
  /** Paleo-Hebrew / Phoenician form, from the Unicode Phoenician block. */
  paleo: string;
  /** The original picture, or an honest note where it is unknown. */
  origin: string;
  /** True when scholars do not agree on the pictographic origin. */
  disputed?: boolean;
}

export const HEBREW: HebrewLetter[] = [
  { letter: 'א', name: 'Aleph', sound: 'silent / glottal stop', value: 1, meaning: 'ox',
    paleo: '\u{10900}', origin: "An ox's head, seen from the front with horns above." },
  { letter: 'ב', name: 'Bet', sound: 'b, v', value: 2, meaning: 'house',
    paleo: '\u{10901}', origin: 'The floor plan of a house or tent.' },
  { letter: 'ג', name: 'Gimel', sound: 'g', value: 3, meaning: 'camel, or throwing stick',
    paleo: '\u{10902}', origin: 'Either a camel or a curved throwing stick.', disputed: true },
  { letter: 'ד', name: 'Dalet', sound: 'd', value: 4, meaning: 'door',
    paleo: '\u{10903}', origin: 'A door, or the flap of a tent.' },
  { letter: 'ה', name: 'He', sound: 'h', value: 5, meaning: 'window, or a man calling out',
    paleo: '\u{10904}', origin: 'A figure with arms raised, or a lattice window.', disputed: true },
  { letter: 'ו', name: 'Vav', sound: 'v, w', value: 6, meaning: 'hook, peg',
    paleo: '\u{10905}', origin: 'A tent peg or nail, with its hooked head.' },
  { letter: 'ז', name: 'Zayin', sound: 'z', value: 7, meaning: 'weapon',
    paleo: '\u{10906}', origin: 'A weapon, often read as a sword or mattock.' },
  { letter: 'ח', name: 'Het', sound: 'kh', value: 8, meaning: 'fence, enclosure',
    paleo: '\u{10907}', origin: 'A wall or courtyard fence.' },
  { letter: 'ט', name: 'Tet', sound: 't', value: 9, meaning: 'uncertain',
    paleo: '\u{10908}', origin: 'Origin not established. A basket, a wheel and a coiled snake have all been proposed.', disputed: true },
  { letter: 'י', name: 'Yod', sound: 'y', value: 10, meaning: 'hand, arm',
    paleo: '\u{10909}', origin: 'An arm and hand. The smallest letter — the "jot" of Matthew 5:18.' },
  { letter: 'כ', final: 'ך', name: 'Kaf', sound: 'k, kh', value: 20, meaning: 'palm of the hand',
    paleo: '\u{1090A}', origin: 'An open palm with the fingers extended.' },
  { letter: 'ל', name: 'Lamed', sound: 'l', value: 30, meaning: 'ox goad, staff',
    paleo: '\u{1090B}', origin: 'A shepherd\u2019s staff or a goad for driving oxen.' },
  { letter: 'מ', final: 'ם', name: 'Mem', sound: 'm', value: 40, meaning: 'water',
    paleo: '\u{1090C}', origin: 'Waves of water \u2014 a wavy line.' },
  { letter: 'נ', final: 'ן', name: 'Nun', sound: 'n', value: 50, meaning: 'fish, or sprout',
    paleo: '\u{1090D}', origin: 'A fish, or a seed sprouting.', disputed: true },
  { letter: 'ס', name: 'Samekh', sound: 's', value: 60, meaning: 'support, pillar',
    paleo: '\u{1090E}', origin: 'Usually read as a pillar or prop, but not settled.', disputed: true },
  { letter: 'ע', name: 'Ayin', sound: 'silent / guttural', value: 70, meaning: 'eye',
    paleo: '\u{1090F}', origin: 'An eye, drawn as a simple circle.' },
  { letter: 'פ', final: 'ף', name: 'Pe', sound: 'p, f', value: 80, meaning: 'mouth',
    paleo: '\u{10910}', origin: 'An open mouth.' },
  { letter: 'צ', final: 'ץ', name: 'Tsade', sound: 'ts', value: 90, meaning: 'uncertain',
    paleo: '\u{10911}', origin: 'Origin not established. A papyrus plant, a fish hook and a man on his side have all been suggested.', disputed: true },
  { letter: 'ק', name: 'Qof', sound: 'k', value: 100, meaning: 'uncertain',
    paleo: '\u{10912}', origin: 'Origin not established. The back of a head, the eye of a needle and a monkey have all been proposed.', disputed: true },
  { letter: 'ר', name: 'Resh', sound: 'r', value: 200, meaning: 'head',
    paleo: '\u{10913}', origin: 'A human head in profile.' },
  { letter: 'ש', name: 'Shin', sound: 'sh, s', value: 300, meaning: 'tooth, or bow',
    paleo: '\u{10914}', origin: 'Two front teeth, or a composite bow.', disputed: true },
  { letter: 'ת', name: 'Tav', sound: 't', value: 400, meaning: 'mark, sign',
    paleo: '\u{10915}', origin: 'A cross-shaped mark \u2014 the signature of someone who could not write.' },
];

export interface GreekLetter {
  upper: string;
  lower: string;
  name: string;
  sound: string;
  value: number;
  note?: string;
}

export const GREEK: GreekLetter[] = [
  { upper: 'Α', lower: 'α', name: 'Alpha',   sound: 'a',   value: 1,
    note: 'From Hebrew aleph. "I am Alpha and Omega" \u2014 the first and the last.' },
  { upper: 'Β', lower: 'β', name: 'Beta',    sound: 'b',   value: 2, note: 'From Hebrew bet, "house".' },
  { upper: 'Γ', lower: 'γ', name: 'Gamma',   sound: 'g',   value: 3 },
  { upper: 'Δ', lower: 'δ', name: 'Delta',   sound: 'd',   value: 4, note: 'From Hebrew dalet, "door".' },
  { upper: 'Ε', lower: 'ε', name: 'Epsilon', sound: 'e',   value: 5 },
  { upper: 'Ζ', lower: 'ζ', name: 'Zeta',    sound: 'z',   value: 7 },
  { upper: 'Η', lower: 'η', name: 'Eta',     sound: 'e\u0304', value: 8 },
  { upper: 'Θ', lower: 'θ', name: 'Theta',   sound: 'th',  value: 9 },
  { upper: 'Ι', lower: 'ι', name: 'Iota',    sound: 'i',   value: 10, note: 'From Hebrew yod, the smallest letter.' },
  { upper: 'Κ', lower: 'κ', name: 'Kappa',   sound: 'k',   value: 20 },
  { upper: 'Λ', lower: 'λ', name: 'Lambda',  sound: 'l',   value: 30 },
  { upper: 'Μ', lower: 'μ', name: 'Mu',      sound: 'm',   value: 40 },
  { upper: 'Ν', lower: 'ν', name: 'Nu',      sound: 'n',   value: 50 },
  { upper: 'Ξ', lower: 'ξ', name: 'Xi',      sound: 'x',   value: 60 },
  { upper: 'Ο', lower: 'ο', name: 'Omicron', sound: 'o',   value: 70 },
  { upper: 'Π', lower: 'π', name: 'Pi',      sound: 'p',   value: 80 },
  { upper: 'Ρ', lower: 'ρ', name: 'Rho',     sound: 'r',   value: 100 },
  { upper: 'Σ', lower: 'σ', name: 'Sigma',   sound: 's',   value: 200, note: 'Written \u03c2 at the end of a word.' },
  { upper: 'Τ', lower: 'τ', name: 'Tau',     sound: 't',   value: 300 },
  { upper: 'Υ', lower: 'υ', name: 'Upsilon', sound: 'u',   value: 400 },
  { upper: 'Φ', lower: 'φ', name: 'Phi',     sound: 'ph',  value: 500 },
  { upper: 'Χ', lower: 'χ', name: 'Chi',     sound: 'ch',  value: 600, note: 'The first letter of \u03a7\u03c1\u03b9\u03c3\u03c4\u03cc\u03c2 \u2014 the X in "Xmas".' },
  { upper: 'Ψ', lower: 'ψ', name: 'Psi',     sound: 'ps',  value: 700 },
  { upper: 'Ω', lower: 'ω', name: 'Omega',   sound: 'o\u0304', value: 800,
    note: 'The last letter. "I am Alpha and Omega."' },
];

/* ------------------------------------------------------------------ lookup */

const HEB_BY_CHAR = new Map<string, HebrewLetter>();
for (const l of HEBREW) {
  HEB_BY_CHAR.set(l.letter, l);
  if (l.final) HEB_BY_CHAR.set(l.final, l);
}

const GRK_BY_CHAR = new Map<string, GreekLetter>();
for (const l of GREEK) {
  GRK_BY_CHAR.set(l.lower, l);
  GRK_BY_CHAR.set(l.upper, l);
}
GRK_BY_CHAR.set('ς', GREEK.find((g) => g.name === 'Sigma')!);

/** Strip vowel points, cantillation marks and Greek accents. */
export function bareConsonants(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0591-\u05C7]/g, '')          // Hebrew points and accents
    .replace(/[\u0300-\u036F]/g, '')          // combining marks, incl. Greek
    .normalize('NFC');
}

export interface LetterBreakdown {
  char: string;
  hebrew?: HebrewLetter;
  greek?: GreekLetter;
}

/** Split a lemma into its letters, with what is known about each. */
export function breakDown(word: string): LetterBreakdown[] {
  const out: LetterBreakdown[] = [];
  for (const char of bareConsonants(word)) {
    const h = HEB_BY_CHAR.get(char);
    const g = GRK_BY_CHAR.get(char);
    if (h || g) out.push({ char, hebrew: h, greek: g });
  }
  return out;
}

/** Gematria — the numeric value of a word, letters doubling as numerals. */
export function numericValue(word: string): number {
  return breakDown(word).reduce(
    (sum, l) => sum + (l.hebrew?.value ?? l.greek?.value ?? 0), 0);
}
