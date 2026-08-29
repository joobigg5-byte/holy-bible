// download-final-offline.cjs
// Downloads the last 5 languages from static, free sources (no API needed).
// After this, all 15 languages will be 100% offline.

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE = path.join(__dirname, '..', 'public', 'bibles');

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
  'Revelation'
];

function bookFile(name) {
  return name.toLowerCase().replace(/ /g, '_') + '.json';
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return resolve(fetchText(res.headers.location));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

function writeBooks(dir, chaptersArray) {
  // chaptersArray: array of 66 chapter maps (or objects with .chapters)
  if (!Array.isArray(chaptersArray)) return;
  fs.mkdirSync(dir, { recursive: true });
  chaptersArray.forEach((book, i) => {
    const name = BOOK_NAMES[i];
    if (!name) return;
    const chaptersObj = Array.isArray(book) ? book : book.chapters;
    if (!chaptersObj) return;
    const chapMap = {};
    chaptersObj.forEach((ch, ci) => {
      const verses = {};
      if (Array.isArray(ch)) {
        ch.forEach((v, vi) => verses[String(vi + 1)] = String(v));
      } else if (typeof ch === 'object') {
        Object.entries(ch).forEach(([k, v]) => verses[k] = String(v));
      }
      if (Object.keys(verses).length) chapMap[String(ci + 1)] = verses;
    });
    if (Object.keys(chapMap).length) {
      fs.writeFileSync(path.join(dir, bookFile(name)), JSON.stringify(chapMap, null, 2));
    }
  });
}

// ─── Languages ──────────────────────────────────────────────────────────────

async function downloadSwahili() {
  const url = 'https://raw.githubusercontent.com/shemmjunior/swahili-bible-edition/main/json/full_version/swahili_bible.json';
  console.log('[Swahili] Downloading...');
  const raw = await fetchText(url);
  const data = JSON.parse(raw);
  writeBooks(path.join(BASE, 'swahili'), data.books || data);
  console.log('  ✓ Swahili done');
}

async function downloadHindi() {
  const dir = path.join(BASE, 'hindi');
  fs.mkdirSync(dir, { recursive: true });
  console.log('[Hindi] Downloading 66 books...');
  for (let i = 0; i < 66; i++) {
    const url = `https://raw.githubusercontent.com/godlytalias/Bible-Database/master/Hindi/json/${i}.json`;
    try {
      const raw = await fetchText(url);
      const data = JSON.parse(raw);
      const chapMap = {};
      for (const ch of Object.keys(data)) {
        const verses = {};
        for (const v of Object.keys(data[ch])) {
          verses[String(parseInt(v) + 1)] = String(data[ch][v]);
        }
        chapMap[String(parseInt(ch) + 1)] = verses;
      }
      if (Object.keys(chapMap).length) {
        fs.writeFileSync(path.join(dir, bookFile(BOOK_NAMES[i])), JSON.stringify(chapMap, null, 2));
      }
    } catch (e) {
      console.error(`  Hindi book ${i} failed: ${e.message}`);
    }
  }
  console.log('  ✓ Hindi done');
}

async function downloadZulu() {
  const dir = path.join(BASE, 'zulu');
  fs.mkdirSync(dir, { recursive: true });
  console.log('[Zulu] Downloading 66 books...');
  for (let i = 0; i < 66; i++) {
    const url = `https://raw.githubusercontent.com/godlytalias/Bible-Database/master/Zulu/json/${i}.json`;
    try {
      const raw = await fetchText(url);
      const data = JSON.parse(raw);
      const chapMap = {};
      for (const ch of Object.keys(data)) {
        const verses = {};
        for (const v of Object.keys(data[ch])) {
          verses[String(parseInt(v) + 1)] = String(data[ch][v]);
        }
        chapMap[String(parseInt(ch) + 1)] = verses;
      }
      if (Object.keys(chapMap).length) {
        fs.writeFileSync(path.join(dir, bookFile(BOOK_NAMES[i])), JSON.stringify(chapMap, null, 2));
      }
    } catch (e) {
      console.error(`  Zulu book ${i} failed: ${e.message}`);
    }
  }
  console.log('  ✓ Zulu done');
}

async function downloadJapanese() {
  const url = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/cross_references/json/jap_kougo.json';
  console.log('[Japanese] Downloading...');
  const raw = await fetchText(url);
  const data = JSON.parse(raw);
  const books = data.books || data;
  const dir = path.join(BASE, 'japanese');
  fs.mkdirSync(dir, { recursive: true });
  books.forEach((b, i) => {
    const name = BOOK_NAMES[i] || b.name;
    const chapMap = {};
    (b.chapters || []).forEach((ch, ci) => {
      const verses = {};
      if (Array.isArray(ch)) {
        ch.forEach((v, vi) => verses[String(vi + 1)] = String(v));
      } else if (typeof ch === 'object') {
        Object.entries(ch).forEach(([k, v]) => verses[k] = String(v));
      }
      if (Object.keys(verses).length) chapMap[String(ci + 1)] = verses;
    });
    if (Object.keys(chapMap).length) {
      fs.writeFileSync(path.join(dir, bookFile(name)), JSON.stringify(chapMap, null, 2));
    }
  });
  console.log('  ✓ Japanese done');
}

async function downloadItalian() {
  const url = 'https://raw.githubusercontent.com/essodjolo/bible/main/json/it_riveduta.json';
  console.log('[Italian] Downloading...');
  const raw = await fetchText(url);
  const data = JSON.parse(raw);
  const books = data.books || data;
  const dir = path.join(BASE, 'italian');
  fs.mkdirSync(dir, { recursive: true });
  books.forEach((b, i) => {
    const name = BOOK_NAMES[i] || b.name;
    const chapMap = {};
    (b.chapters || []).forEach((ch, ci) => {
      const verses = {};
      for (const v in (ch || {})) verses[v] = String(ch[v]);
      if (Object.keys(verses).length) chapMap[String(ci + 1)] = verses;
    });
    if (Object.keys(chapMap).length) {
      fs.writeFileSync(path.join(dir, bookFile(name)), JSON.stringify(chapMap, null, 2));
    }
  });
  console.log('  ✓ Italian done');
}

// ─── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log('📥 Downloading the final 5 offline languages...\n');
  await downloadSwahili();
  await downloadHindi();
  await downloadZulu();
  await downloadJapanese();
  await downloadItalian();
  console.log('\n🎉 All 15 languages are now fully offline!');
})();