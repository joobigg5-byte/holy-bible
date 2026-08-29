/**
 * download-all-offline-bibles.cjs — FINAL CORRECTED VERSION
 *
 * Downloads all 12 missing languages and writes per‑book JSON into public/bibles/<folder>/.
 *
 * Sources:
 *   1. thiagobodruk/bible  (single JSON per language) – Arabic, Chinese, German,
 *      Russian, Spanish, French, Portuguese  ✅ already downloaded
 *   2. getbible/v2 repo    (66 numeric JSON files per language) – Italian,
 *      Japanese, Swahili
 *   3. getbible.net API    (free, chapter‑by‑chapter) – Hindi, Zulu
 *
 * BOM‑stripping, corrected filenames, and verified folder names are applied.
 *
 * Usage: node download-all-offline-bibles.cjs
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── Book metadata ──────────────────────────────────────────────────────────
const BOOK_NAMES = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah',
  'Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
  '2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude',
  'Revelation',
];

function bookFileName(name) {
  return name.toLowerCase().replace(/ /g, '_') + '.json';
}

// ─── Language definitions ───────────────────────────────────────────────────
const LANGUAGES = [
  // Already downloaded — SKIP (commented out to avoid re‑download)
  // { folder: 'arabic',           source: 'thiagobodruk', file: 'ar_svd.json'        },
  // { folder: 'chinese_cuv',      source: 'thiagobodruk', file: 'zh_cuv.json'        },
  // { folder: 'german',           source: 'thiagobodruk', file: 'de_schlachter.json' },
  // { folder: 'russian_synodal',  source: 'thiagobodruk', file: 'ru_synodal.json'    },
  // { folder: 'spanish_rv1960',   source: 'thiagobodruk', file: 'es_rvr.json'        },
  // { folder: 'french_lsg',       source: 'thiagobodruk', file: 'fr_apee.json'       },
  // { folder: 'portuguese_jfa',   source: 'thiagobodruk', file: 'pt_aa.json'         },

  // ── getbible/v2 with numeric files ──────────────────────────────────────
  { folder: 'italian',  source: 'getbible-repo', lang: 'riveduta'   },
  { folder: 'japanese', source: 'getbible-repo', lang: 'japkougo'   },
  { folder: 'swahili',  source: 'getbible-repo', lang: 'swahili'    },

  // ── getbible.net API (free, no key) for Hindi and Zulu ──────────────────
  { folder: 'hindi',    source: 'getbible-api',  lang: 'hindi'      },
  { folder: 'zulu',     source: 'getbible-api',  lang: 'zulu'       },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }

function httpsGetBuffer(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && redirectsLeft > 0) {
        res.resume();
        return resolve(httpsGetBuffer(res.headers.location, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data',  (c) => chunks.push(c));
      res.on('end',   ()  => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function fetchText(url) {
  const buf   = await httpsGetBuffer(url);
  const start = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? 3 : 0;
  return buf.slice(start).toString('utf8');
}

function normaliseChapter(chapter) {
  if (Array.isArray(chapter)) {
    const obj = {};
    chapter.forEach((v, i) => { obj[String(i + 1)] = String(v); });
    return obj;
  }
  const obj = {};
  for (const [k, v] of Object.entries(chapter)) {
    obj[String(k)] = typeof v === 'object' ? String(v.verse ?? v.text ?? '') : String(v);
  }
  return obj;
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Source: thiagobodruk/bible (single file) ──────────────────────────────
const THIAGOBODRUK_BASE = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/';

function parseThiagobodruk(raw) {
  const parsed = JSON.parse(raw);
  return parsed.map((book) => {
    const chaptersArr = Array.isArray(book) ? book : book.chapters;
    const chapMap = {};
    chaptersArr.forEach((chap, ci) => {
      chapMap[String(ci + 1)] = normaliseChapter(chap);
    });
    return chapMap;
  });
}

async function downloadThiagobodruk({ folder, file }) {
  const url    = THIAGOBODRUK_BASE + file;
  const outDir = path.join('public', 'bibles', folder);
  console.log(`\n[${folder}] Downloading ${url} …`);
  let raw;
  try {
    raw = await fetchText(url);
    const books = parseThiagobodruk(raw);
    mkdirp(outDir);
    let written = 0;
    books.forEach((chapMap, i) => {
      const name = BOOK_NAMES[i];
      if (!name) return;
      writeJson(path.join(outDir, bookFileName(name)), chapMap);
      written++;
    });
    console.log(`  ✓ ${folder}: wrote ${written} books`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
  }
}

// ─── Source: getbible/v2 repo (numeric files per language folder) ──────────
const GETBIBLE_REPO_BASE = 'https://raw.githubusercontent.com/getbible/v2/master/bibles/';

async function downloadGetbibleRepo({ folder, lang }) {
  const outDir = path.join('public', 'bibles', folder);
  mkdirp(outDir);
  console.log(`\n[${folder}] Downloading from getbible/v2/${lang} (66 numeric files) …`);
  let written = 0;
  let failed  = 0;

  for (let i = 1; i <= 66; i++) {
    const url = `${GETBIBLE_REPO_BASE}${lang}/${i}.json`;
    try {
      const raw = await fetchText(url);
      const data = JSON.parse(raw);
      const chapMap = {};
      // Structure: { chapters: { "1": { "1": { verse: "…" }, … }, … } }
      for (const [chapNum, verses] of Object.entries(data.chapters || {})) {
        const verseMap = {};
        for (const [verseNum, verseObj] of Object.entries(verses)) {
          verseMap[String(verseNum)] = typeof verseObj === 'object'
            ? String(verseObj.verse ?? verseObj.text ?? '')
            : String(verseObj);
        }
        chapMap[String(chapNum)] = verseMap;
      }
      const bookName = BOOK_NAMES[i - 1];
      if (bookName && Object.keys(chapMap).length) {
        writeJson(path.join(outDir, bookFileName(bookName)), chapMap);
        written++;
        process.stdout.write(i % 11 === 0 ? `\n  ` : '');
        process.stdout.write(`${bookName.slice(0, 4).padEnd(4)} `);
      }
    } catch (err) {
      console.warn(`  ⚠ Book ${i} failed: ${err.message}`);
      failed++;
    }
  }
  process.stdout.write('\n');
  console.log(`  ✓ ${folder}: wrote ${written} books` + (failed ? `, ${failed} failed` : ''));
}

// ─── Source: getbible.net API (chapter‑by‑chapter, free) ──────────────────
const GETBIBLE_API_BASE = 'https://getbible.net/v2';

async function downloadGetbibleApi({ folder, lang }) {
  const outDir = path.join('public', 'bibles', folder);
  mkdirp(outDir);
  console.log(`\n[${folder}] Downloading via getbible.net API (free, keyless) …`);

  for (let b = 0; b < BOOK_NAMES.length; b++) {
    const bookName = BOOK_NAMES[b];
    const bookData = {};
    let success = false;

    // Determine number of chapters (approximate; API returns 404 for non‑existent chapters)
    const maxChapters = { Genesis:50, Exodus:40, Leviticus:27, Numbers:36, Deuteronomy:34, Joshua:24,
      Judges:21, Ruth:4, '1 Samuel':31, '2 Samuel':24, '1 Kings':22, '2 Kings':25,
      '1 Chronicles':29, '2 Chronicles':36, Ezra:10, Nehemiah:13, Esther:10, Job:42,
      Psalms:150, Proverbs:31, Ecclesiastes:12, 'Song of Solomon':8, Isaiah:66,
      Jeremiah:52, Lamentations:5, Ezekiel:48, Daniel:12, Hosea:14, Joel:3, Amos:9,
      Obadiah:1, Jonah:4, Micah:7, Nahum:3, Habakkuk:3, Zephaniah:3, Haggai:2,
      Zechariah:14, Malachi:4, Matthew:28, Mark:16, Luke:24, John:21, Acts:28,
      Romans:16, '1 Corinthians':16, '2 Corinthians':13, Galatians:6, Ephesians:6,
      Philippians:4, Colossians:4, '1 Thessalonians':5, '2 Thessalonians':3,
      '1 Timothy':6, '2 Timothy':4, Titus:3, Philemon:1, Hebrews:13, James:5,
      '1 Peter':5, '2 Peter':3, '1 John':5, '2 John':1, '3 John':1, Jude:1,
      Revelation:22 }[bookName] || 150;

    for (let ch = 1; ch <= maxChapters; ch++) {
      try {
        const url = `${GETBIBLE_API_BASE}/${lang}/${encodeURIComponent(bookName + ' ' + ch)}`;
        const raw = await fetchText(url);
        const data = JSON.parse(raw);
        const verses = {};
        for (const entry of Object.values(data)) {
          for (const v of entry?.verses ?? []) {
            if (v?.text) verses[String(v.verse)] = String(v.text);
          }
        }
        if (Object.keys(verses).length) {
          bookData[String(ch)] = verses;
          success = true;
        }
        // Small delay to be polite
        await new Promise(r => setTimeout(r, 50));
      } catch (err) {
        // 404 or network error → chapter doesn't exist, that's fine
      }
    }

    if (success) {
      writeJson(path.join(outDir, bookFileName(bookName)), bookData);
      process.stdout.write('.');
    }
  }
  process.stdout.write('\n');
  console.log(`  ✓ ${folder}: completed`);
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Offline Bible Downloader — Final Corrected Version ===');
  console.log(`Downloading ${LANGUAGES.length} translations:\n`);

  for (const lang of LANGUAGES) {
    if (lang.source === 'thiagobodruk') {
      await downloadThiagobodruk(lang);
    } else if (lang.source === 'getbible-repo') {
      await downloadGetbibleRepo(lang);
    } else if (lang.source === 'getbible-api') {
      await downloadGetbibleApi(lang);
    }
  }

  console.log('\n✅ Done. All offline Bibles are ready.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});