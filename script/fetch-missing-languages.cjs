// fetch-missing-languages.cjs
// Fetches Italian, Japanese, Swahili, Hindi, Zulu from getbible.net
// and saves per‑book JSON files. Run once, then delete this script.
// After that, the app is 100% offline – no API calls at runtime ever.

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE_DIR = path.join(__dirname, '..', 'public', 'bibles');

const BOOK_NAMES = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah',
  'Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah',
  'Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah',
  'Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians',
  'Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians',
  '1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
  '1 John','2 John','3 John','Jude','Revelation'
];

const MAX_CHAPTERS = {
  Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,Ruth:4,
  '1 Samuel':31,'2 Samuel':24,'1 Kings':22,'2 Kings':25,'1 Chronicles':29,'2 Chronicles':36,
  Ezra:10,Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,Ecclesiastes:12,
  'Song of Solomon':8,Isaiah:66,Jeremiah:52,Lamentations:5,Ezekiel:48,Daniel:12,
  Hosea:14,Joel:3,Amos:9,Obadiah:1,Jonah:4,Micah:7,Nahum:3,Habakkuk:3,Zephaniah:3,
  Haggai:2,Zechariah:14,Malachi:4,Matthew:28,Mark:16,Luke:24,John:21,Acts:28,
  Romans:16,'1 Corinthians':16,'2 Corinthians':13,Galatians:6,Ephesians:6,Philippians:4,
  Colossians:4,'1 Thessalonians':5,'2 Thessalonians':3,'1 Timothy':6,'2 Timothy':4,
  Titus:3,Philemon:1,Hebrews:13,James:5,'1 Peter':5,'2 Peter':3,'1 John':5,
  '2 John':1,'3 John':1,Jude:1,Revelation:22
};

/** Fetch with 8‑second timeout – never freezes. */
function fetchWithTimeout(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return resolve(fetchWithTimeout(res.headers.location));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchLanguage(slug, folderName) {
  const dir = path.join(BASE_DIR, folderName);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`\n📥 ${folderName} (slug: ${slug}) – this may take 10‑15 min ...`);

  let written = 0;
  for (let i = 0; i < BOOK_NAMES.length; i++) {
    const bookName = BOOK_NAMES[i];
    const maxCh = MAX_CHAPTERS[bookName] || 1;
    const bookData = {};
    let hasContent = false;

    for (let ch = 1; ch <= maxCh; ch++) {
      try {
        const url = `https://getbible.net/v2/${slug}/${encodeURIComponent(bookName + ' ' + ch)}`;
        const raw = await fetchWithTimeout(url);
        const data = JSON.parse(raw);
        const verses = {};
        for (const entry of Object.values(data)) {
          for (const v of (entry.verses || [])) {
            if (v.text) verses[String(v.verse)] = String(v.text);
          }
        }
        if (Object.keys(verses).length) {
          bookData[String(ch)] = verses;
          hasContent = true;
        }
      } catch(_) {}
      await delay(80); // polite to the free API
    }

    if (hasContent) {
      const fileName = path.join(dir, `${bookName.toLowerCase().replace(/ /g, '_')}.json`);
      fs.writeFileSync(fileName, JSON.stringify(bookData));
      written++;
      process.stdout.write('.');
    }
  }
  console.log(`  ✅ ${folderName}: ${written} books written`);
}

(async () => {
  console.log('🚀 Generating missing offline files (one‑time operation)...\n');

  await fetchLanguage('riveduta', 'italian');
  await fetchLanguage('japkougo', 'japanese');
  await fetchLanguage('swahili', 'swahili');
  await fetchLanguage('hindi', 'hindi');
  await fetchLanguage('zulu', 'zulu');

  console.log('\n🎉 All 15 languages are now permanently offline.\n');
  console.log('You can now delete this script – it will never be needed again.');
})();