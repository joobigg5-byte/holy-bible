/**
 * download-remaining-offline.cjs
 * 
 * Automatically discovers the correct JSON files for the remaining languages
 * in the thiagobodruk/bible GitHub repo and downloads them.
 * After this, all 15 languages will be 100% offline.
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const REPO_API_URL = 'https://api.github.com/repos/thiagobodruk/bible/contents/json';
const RAW_BASE     = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/';
const OUTPUT_DIR   = path.join(__dirname, '..', 'public', 'bibles');

// Language codes to match (lowercase, look for these in filenames)
const NEEDED_LANGS = [
  { code: 'it',    folder: 'italian'  },
  { code: 'ja',    folder: 'japanese' },
  { code: 'sw',    folder: 'swahili'  },
  { code: 'hi',    folder: 'hindi'    },
  { code: 'zu',    folder: 'zulu'     },
];

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      if (res.statusCode === 302) return resolve(httpsGetJson(res.headers.location));
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function downloadRawFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302) return resolve(downloadRawFile(res.headers.location));
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        let buf = Buffer.concat(chunks);
        if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) buf = buf.slice(3);
        resolve(buf.toString('utf8'));
      });
    }).on('error', reject);
  });
}

function normaliseChapter(chapter) {
  const obj = {};
  if (Array.isArray(chapter)) {
    chapter.forEach((v, i) => obj[String(i + 1)] = String(v));
  } else {
    for (const [k, v] of Object.entries(chapter)) {
      obj[String(k)] = typeof v === 'object' ? String(v.verse || v.text || '') : String(v);
    }
  }
  return obj;
}

function parseBible(raw) {
  const data = JSON.parse(raw);
  return data.map(book => {
    const chapters = Array.isArray(book) ? book : book.chapters;
    const chapMap = {};
    if (chapters) chapters.forEach((ch, i) => { chapMap[String(i+1)] = normaliseChapter(ch); });
    return chapMap;
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Fetching file list from thiagobodruk/bible...\n');
  let files;
  try {
    files = await httpsGetJson(REPO_API_URL);
  } catch(e) {
    console.error('Failed to get file list:', e.message);
    return;
  }

  const jsonFiles = files.filter(f => f.name.endsWith('.json'));
  console.log(`Found ${jsonFiles.length} JSON files in the repo.\n`);

  for (const lang of NEEDED_LANGS) {
    // Find a file whose name contains the language code (e.g., "it_", "_it", etc.)
    const match = jsonFiles.find(f => {
      const lower = f.name.toLowerCase();
      return lower.includes(`_${lang.code}.`) || lower.includes(`${lang.code}_`) || lower === `${lang.code}.json`;
    });

    if (!match) {
      console.warn(`⚠️  No file found for ${lang.code} (${lang.folder}). Skipping.`);
      continue;
    }

    const url = RAW_BASE + match.name;
    const outDir = path.join(OUTPUT_DIR, lang.folder);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    console.log(`📥 ${lang.folder} ← ${match.name}`);
    try {
      const raw = await downloadRawFile(url);
      const books = parseBible(raw);
      let written = 0;
      books.forEach((chapMap, i) => {
        const name = BOOK_NAMES[i];
        if (!name || Object.keys(chapMap).length === 0) return;
        const fname = path.join(outDir, name.toLowerCase().replace(/ /g, '_') + '.json');
        fs.writeFileSync(fname, JSON.stringify(chapMap, null, 2));
        written++;
      });
      console.log(`   ✅ ${written} books written.`);
    } catch(e) {
      console.error(`   ❌ Failed: ${e.message}`);
    }
  }

  console.log('\n🏁 All remaining languages processed. Check public/bibles/ for the files.');
}

main();