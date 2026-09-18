/**
 * Shareable verse links.
 *
 * The reader remembered where you were in localStorage, which is right
 * for coming back to it — but it meant every link to the app opened at
 * wherever you happened to stop. There was no way to send someone a
 * verse.
 *
 * Now:
 *   /read?b=john&c=3&v=16
 *
 * A URL wins over the remembered position, because someone following a
 * link wants the verse in the link, not their own last page. Reading
 * normally still saves and restores as before.
 *
 * The address updates as you move, so the browser's back button works
 * through chapters and the address bar is always shareable. replaceState
 * rather than pushState while scrolling, so a chapter does not leave a
 * hundred history entries behind.
 *
 * This is what lets ChurchOS put a verse on screen during a service and
 * have every phone in the room open it.
 *
 * Run from the HOLY BIBLE folder:  node add-verse-urls.cjs
 */

const fs = require("fs");
const f = "src/pages/ReadBible.tsx";
let c = fs.readFileSync(f, "utf8");
const before = c;

if (c.includes("positionFromUrl")) {
  console.log("already added");
  process.exit(0);
}

/* ── the helpers ──────────────────────────────────────────────────── */

const helpers = `
/**
 * A position from the address bar, if there is one.
 *
 * Accepts the short form people can type — ?b=john&c=3&v=16 — and the
 * long one a link might carry. Book names are matched loosely because
 * "1 John", "1john" and "1-john" are all the same book to a person.
 */
function positionFromUrl(): Partial<Position> | null {
  if (typeof window === 'undefined') return null;

  const p = new URLSearchParams(window.location.search);
  const book = p.get('b') ?? p.get('book');
  const chapter = p.get('c') ?? p.get('chapter');
  const verse = p.get('v') ?? p.get('verse');

  if (!book && !chapter) return null;

  const out: Record<string, unknown> = {};
  if (book) out.book = normaliseBookName(book);
  if (chapter) {
    const n = parseInt(chapter, 10);
    if (Number.isFinite(n) && n > 0) out.chapter = n;
  }
  if (verse) {
    const n = parseInt(verse, 10);
    if (Number.isFinite(n) && n > 0) out.verse = n;
  }

  return Object.keys(out).length ? (out as Partial<Position>) : null;
}

/** "1john" and "1-John" and "1 john" all mean the same book. */
function normaliseBookName(raw: string): string {
  return decodeURIComponent(raw)
    .replace(/[-_+]/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^(\\d)\\s*/, '$1 ')
    .replace(/\\b\\w/g, (ch) => ch.toUpperCase());
}

/**
 * Keeps the address bar in step with where the reader is.
 *
 * replaceState rather than pushState: scrolling through a chapter should
 * not fill the back button with a hundred entries.
 */
function writePositionToUrl(pos: Position) {
  if (typeof window === 'undefined') return;
  try {
    const p = new URLSearchParams();
    const anyPos = pos as unknown as Record<string, unknown>;
    if (anyPos.book) p.set('b', String(anyPos.book).toLowerCase().replace(/\\s+/g, '-'));
    if (anyPos.chapter) p.set('c', String(anyPos.chapter));
    if (anyPos.verse) p.set('v', String(anyPos.verse));
    const next = window.location.pathname + '?' + p.toString();
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, '', next);
    }
  } catch { /* an address that will not update is not worth an error */ }
}

`;

// Put the helpers above the component.
const compIdx = c.search(/export default function|const ReadBible/);
if (compIdx < 0) {
  console.log("could not find the component — nothing changed");
  process.exit(1);
}
const insertAt = c.lastIndexOf("\n", compIdx);
c = c.slice(0, insertAt) + "\n" + helpers + c.slice(insertAt);

/* ── the URL wins over the remembered position ────────────────────── */

const oldInit = `  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === 'undefined') return DEFAULT_POS;
    try {
      const raw = localStorage.getItem(POSITION_KEY);
      if (raw) return JSON.parse(raw) as Position;
    } catch { /* noop */ }
    return DEFAULT_POS;
  });`;

const newInit = `  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === 'undefined') return DEFAULT_POS;

    // Someone following a link wants the verse in the link, not their
    // own last page. So the URL wins.
    const saved = (() => {
      try {
        const raw = localStorage.getItem(POSITION_KEY);
        if (raw) return JSON.parse(raw) as Position;
      } catch { /* noop */ }
      return DEFAULT_POS;
    })();

    const fromUrl = positionFromUrl();
    return fromUrl ? ({ ...saved, ...fromUrl } as Position) : saved;
  });`;

if (!c.includes(oldInit)) {
  console.log("could not find the position initialiser — nothing changed");
  process.exit(1);
}
c = c.replace(oldInit, newInit);

/* ── keep the address in step ─────────────────────────────────────── */

// Attach to whichever effect already saves the position, so the two stay
// together rather than drifting apart.
const saveIdx = c.indexOf("localStorage.setItem(POSITION_KEY");
if (saveIdx > 0) {
  const lineEnd = c.indexOf("\n", saveIdx);
  c =
    c.slice(0, lineEnd + 1) +
    "    writePositionToUrl(position);\n" +
    c.slice(lineEnd + 1);
} else {
  // No save effect found, so add one of our own.
  const afterInit = c.indexOf("});", c.indexOf(newInit)) + 3;
  c =
    c.slice(0, afterInit) +
    "\n\n  useEffect(() => { writePositionToUrl(position); }, [position]);" +
    c.slice(afterInit);
}

fs.writeFileSync(f, c);
console.log(c !== before ? "VERSE URLS ADDED" : "NO CHANGE");
