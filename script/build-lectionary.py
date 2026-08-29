#!/usr/bin/env python3
"""Generate a 365-day, three-watch lectionary as TypeScript."""
import json, os, re, math, sys
from lectionary_pools import MORNING, AFTERNOON, EVENING

KJV_DIR = "public/bibles/en_kjv"
INDEX = "public/scribe-index.json"
DAYS = 365

# --- load text -------------------------------------------------------------
kjv = {}
for fn in os.listdir(KJV_DIR):
    book = fn[:-5].replace("_", " ").title()
    kjv[book] = json.load(open(os.path.join(KJV_DIR, fn), encoding="utf-8"))

# Title() breaks "Song Of Solomon" -> keep a lookup that tolerates it
def get(book, ch, v):
    b = kjv.get(book)
    if b is None:
        for k in kjv:
            if k.lower() == book.lower():
                b = kjv[k]; break
    if b is None: return None
    return b.get(str(ch), {}).get(str(v))

def text_for(book, ch, vs, ve):
    parts = []
    for v in range(vs, (ve or vs) + 1):
        t = get(book, ch, v)
        if not t: return None
        parts.append(t)
    return " ".join(parts)

# --- themed fill -----------------------------------------------------------
idx = json.load(open(INDEX, encoding="utf-8"))
VERSES, POSTINGS = idx["verses"], idx["index"]

THEMES = {
    "morning": ["morning","light","arise","awake","dawn","mercy","mercies","renew","new","praise",
                "rejoice","bless","strength","strengthen","guide","path","hope","faithfulness",
                "salvation","glory","sing","joy","begin","early","sun","shine"],
    "afternoon": ["labour","work","diligent","patience","patient","endure","endureth","persevere",
                  "faithful","steadfast","fruit","harvest","reap","sow","wisdom","understanding",
                  "integrity","just","kindness","neighbour","serve","strive","run","race","press"],
    "evening": ["rest","peace","quiet","still","sleep","night","evening","refuge","shield","keep",
                "keeper","comfort","shadow","dwell","abide","trust","safe","deliver","forgive",
                "search","heart","meditate","remember","everlasting","gentle"],
}

# Pastoral weighting — same idea as the Scribe: keep genealogies out.
WEIGHT = {"Psalms":2.4,"Isaiah":1.8,"Proverbs":1.8,"John":1.7,"Matthew":1.5,"Luke":1.5,"Mark":1.3,
          "Romans":1.6,"Philippians":1.7,"Hebrews":1.5,"James":1.5,"1 Peter":1.5,"1 John":1.5,
          "2 Corinthians":1.4,"1 Corinthians":1.3,"Ephesians":1.4,"Colossians":1.4,"Galatians":1.3,
          "Ecclesiastes":1.3,"Lamentations":1.2,"Job":0.9,"Jeremiah":0.9,"Revelation":1.0,
          "1 Chronicles":0.05,"2 Chronicles":0.05,"Numbers":0.05,"Leviticus":0.05,"Joshua":0.15,
          "Judges":0.15,"1 Kings":0.15,"2 Kings":0.15,"Ezra":0.15,"Nehemiah":0.3,"Esther":0.2,
          "Ezekiel":0.4,"Deuteronomy":0.6,"Song Of Solomon":0.3}

# Reject verses that read badly out of context
BAD = re.compile(
    r"\b(begat|slew|smote|circumcis|whoredom|concubine|dung|leprosy|pisseth|bastard|"
    r"cubits|shekels|homer|ephah|firstborn of|sons of|daughters of|the son of)\b", re.I)

# Reject verses whose tone is wrong for a daily devotional. Judgement and
# lament are scripture too, but they are not what a watch verse is for.
HARSH = re.compile(
    r"\b(vanity|wicked|wickedness|enemies|enemy|persecute\w*|snare|offender|destroy\w*|"
    r"perish|wrath|curse[sd]?|cursed|slain|slay|vengeance|avenge|punish\w*|reproach|"
    r"plague|famine|sword|desolat\w*|abomination|hell|devour\w*|smite|scatter\w*|"
    r"heathen|adulter\w*|whore|drunkard|fool[s]?|foolish|hate[sd]?|hateth|"
    r"consume[sd]?|wither\w*|tremble\w*|terror|dread|serpent|viper)\b", re.I)

PROPER = re.compile(r"\b[A-Z][a-z]{2,}\b")
FRAGMENT = re.compile(
    r"^(That|Which|Who|Whom|Whose|Nevertheless|Wherefore|Howbeit|Neither|Nor|Yea|Also|"
    r"Then|Because|But|So that|For which|Unto whom|In whom|To whom|And when|And it)\b")

def acceptable(book, ch, v, txt):
    if not txt or not (60 <= len(txt) <= 230): return False
    if BAD.search(txt): return False
    if HARSH.search(txt): return False
    # Mid-clause fragments never stand alone as a daily verse
    if FRAGMENT.match(txt.strip()): return False
    if txt.rstrip().endswith((",", ";", ":")): return False
    # Question-only verses read oddly as a blessing
    if txt.count("?") >= 2: return False
    # Too many proper nouns => narrative fragment, not devotional
    names = [w for w in PROPER.findall(txt)
             if w not in ("LORD","God","Lord","Jesus","Christ","Israel","Spirit","Holy","Father","Son")]
    if len(names) > 1: return False
    return True

def themed_pool(watch, exclude, target):
    total = len(VERSES)
    scores = {}
    for term in THEMES[watch]:
        post = POSTINGS.get(term)
        if not post: continue
        idf = math.log(total / len(post))
        for vid in post:
            scores[vid] = scores.get(vid, 0) + idf
    ranked = []
    for vid, s in scores.items():
        book, ch, v = VERSES[str(vid)].split("|")
        ranked.append((s * WEIGHT.get(book, 1.0), book, int(ch), int(v)))
    ranked.sort(reverse=True)

    out = []
    for _, book, ch, v in ranked:
        if (book, ch, v) in exclude: continue
        txt = get(book, ch, v)
        if not acceptable(book, ch, v, txt): continue
        out.append((book, ch, v, None))
        exclude.add((book, ch, v))
        if len(out) >= target: break
    return out

def build(watch, curated, target):
    used = set()
    pool = []
    for book, ch, vs, ve in curated:
        t = text_for(book, ch, vs, ve)
        if not t:
            print(f"  !! missing {book} {ch}:{vs}", file=sys.stderr)
            continue
        pool.append((book, ch, vs, ve))
        for v in range(vs, (ve or vs) + 1):
            used.add((book, ch, v))
    pool += themed_pool(watch, used, max(0, target - len(pool)))
    return pool[:target]

# Prime pool sizes. Each verse recurs roughly twice a year, which is normal for
# a devotional, but because the three lengths are coprime the *combination* of
# morning/afternoon/evening does not repeat for 181 x 179 x 173 days.
POOL_SIZES = {"morning": 181, "afternoon": 179, "evening": 173}

pools = {
    "morning": build("morning", MORNING, POOL_SIZES["morning"]),
    "afternoon": build("afternoon", AFTERNOON, POOL_SIZES["afternoon"]),
    "evening": build("evening", EVENING, POOL_SIZES["evening"]),
}
for w, p in pools.items():
    print(f"{w:10s} pool of {len(p)}")

BOOK_CODES = {
    "Genesis":"GEN","Exodus":"EXO","Leviticus":"LEV","Numbers":"NUM","Deuteronomy":"DEU",
    "Joshua":"JOS","Judges":"JDG","Ruth":"RUT","1 Samuel":"1SA","2 Samuel":"2SA","1 Kings":"1KI",
    "2 Kings":"2KI","1 Chronicles":"1CH","2 Chronicles":"2CH","Ezra":"EZR","Nehemiah":"NEH",
    "Esther":"EST","Job":"JOB","Psalms":"PSA","Proverbs":"PRO","Ecclesiastes":"ECC",
    "Song Of Solomon":"SNG","Isaiah":"ISA","Jeremiah":"JER","Lamentations":"LAM","Ezekiel":"EZK",
    "Daniel":"DAN","Hosea":"HOS","Joel":"JOL","Amos":"AMO","Obadiah":"OBA","Jonah":"JON",
    "Micah":"MIC","Nahum":"NAM","Habakkuk":"HAB","Zephaniah":"ZEP","Haggai":"HAG",
    "Zechariah":"ZEC","Malachi":"MAL","Matthew":"MAT","Mark":"MRK","Luke":"LUK","John":"JHN",
    "Acts":"ACT","Romans":"ROM","1 Corinthians":"1CO","2 Corinthians":"2CO","Galatians":"GAL",
    "Ephesians":"EPH","Philippians":"PHP","Colossians":"COL","1 Thessalonians":"1TH",
    "2 Thessalonians":"2TH","1 Timothy":"1TI","2 Timothy":"2TI","Titus":"TIT","Philemon":"PHM",
    "Hebrews":"HEB","James":"JAS","1 Peter":"1PE","2 Peter":"2PE","1 John":"1JN","2 John":"2JN",
    "3 John":"3JN","Jude":"JUD","Revelation":"REV",
}

def esc(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')

def ref(book, ch, vs, ve):
    disp = "Psalm" if book == "Psalms" else book
    return f"{disp} {ch}:{vs}-{ve}" if ve and ve != vs else f"{disp} {ch}:{vs}"

def entry(book, ch, vs, ve, indent):
    t = text_for(book, ch, vs, ve)
    pad = " " * indent
    lines = [f'{pad}{{ book: "{book}", chapter: {ch}, verseStart: {vs},']
    if ve and ve != vs:
        lines[-1] += f" verseEnd: {ve},"
    lines.append(f'{pad}  reference: "{ref(book,ch,vs,ve)}", translation: "KJV",')
    lines.append(f'{pad}  text: "{esc(t)}" }}')
    return "\n".join(lines)

rows = []
for i in range(DAYS):
    m = pools["morning"][i % len(pools["morning"])]
    a = pools["afternoon"][i % len(pools["afternoon"])]
    e = pools["evening"][i % len(pools["evening"])]
    rows.append(
        f"  // Day {i+1}\n  {{\n"
        f"    morning:\n{entry(*m, 6)},\n"
        f"    afternoon:\n{entry(*a, 6)},\n"
        f"    evening:\n{entry(*e, 6)},\n"
        f"  }},"
    )

codes = ",\n".join(f'  "{b}": "{c}"' for b, c in sorted(BOOK_CODES.items()))

out = f'''/**
 * Daily lectionary — {DAYS} days, three watches.
 *
 * Generated by script/build-lectionary.mjs. Verse text is KJV, read straight
 * from public/bibles/en_kjv. Other languages resolve at runtime through
 * BibleService, so nothing here needs translating by hand.
 *
 * To change the plan, edit the reference pools in the generator and re-run it.
 */

export type WatchPeriod = 'morning' | 'afternoon' | 'evening';

export interface Verse {{
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  text: string;
  /** Optional hand-supplied Twi text. Otherwise resolved via BibleService. */
  twi?: string;
  translation: string;
  reference: string;
  /** API.Bible passage id, e.g. "LAM.3.22-LAM.3.23". Computed if absent. */
  passageId?: string;
}}

const BOOK_CODES: Record<string, string> = {{
{codes}
}};

export function buildPassageId(
  v: Omit<Verse, 'passageId' | 'text' | 'translation' | 'reference'>,
): string {{
  const code = BOOK_CODES[v.book] ?? v.book.slice(0, 3).toUpperCase();
  const start = `${{code}}.${{v.chapter}}.${{v.verseStart}}`;
  const end = v.verseEnd ? `${{code}}.${{v.chapter}}.${{v.verseEnd}}` : start;
  return start === end ? start : `${{start}}-${{end}}`;
}}

export interface DayLectionary {{
  morning: Verse;
  afternoon: Verse;
  evening: Verse;
}}

export const lectionary: DayLectionary[] = [
{chr(10).join(rows)}
];

export function getWatchPeriod(): WatchPeriod {{
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}}

export function getWatchLabel(watch: WatchPeriod): string {{
  switch (watch) {{
    case 'morning': return 'Morning Watch';
    case 'afternoon': return 'Afternoon Watch';
    case 'evening': return 'Evening Watch';
  }}
}}

export function getDayOfYear(date: Date = new Date()): number {{
  const start = new Date(date.getFullYear(), 0, 0);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor((date.getTime() - start.getTime()) / oneDay);
}}

/** Day index into the plan, 0-based. Wraps if the year is longer than the plan. */
export function getDayIndex(date: Date = new Date()): number {{
  return (getDayOfYear(date) - 1 + lectionary.length) % lectionary.length;
}}

export function getTodaysVerse(date: Date = new Date()): {{ verse: Verse; watch: WatchPeriod }} {{
  const day = lectionary[getDayIndex(date)];
  const watch = getWatchPeriod();
  const v = day[watch];
  return {{ verse: {{ ...v, passageId: v.passageId ?? buildPassageId(v) }}, watch }};
}}

/** All three watches for a given day — useful for a day view or notifications. */
export function getDay(date: Date = new Date()): DayLectionary {{
  return lectionary[getDayIndex(date)];
}}
'''

os.makedirs("src/data", exist_ok=True)
open("src/data/lectionary.ts", "w", encoding="utf-8").write(out)
print("wrote src/data/lectionary.ts")
