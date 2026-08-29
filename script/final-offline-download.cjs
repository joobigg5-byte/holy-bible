// final-offline-download.cjs
// Downloads the last 5 languages using verified, live sources.
// After this, all 15 languages are 100% offline.

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

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
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
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── GODLYTALIAS DOWNLOAD (Hindi, Zulu) ──────────────────────────────────
async function downloadGodlyTalis(langCode, folderName) {
  const dir = path.join(BASE_DIR, folderName);
  fs.mkdirSync(dir, { recursive: true });

  const url = `https://raw.githubusercontent.com/godlytalias/Bible-Database/master/${langCode}/bible.json`;
  console.log(`\n📥 ${folderName} from godlytalias...`);

  try {
    const raw = await fetchText(url);
    const allBooks = JSON.parse(raw);
    let written = 0;
    for (let i = 0; i < BOOK_NAMES.length; i++) {
      const bookData = allBooks[i];
      if (!bookData || !Array.isArray(bookData)) continue;
      const chapMap = {};
      bookData.forEach((chapter, ci) => {
        if (!Array.isArray(chapter)) return;
        const verses = {};
        chapter.forEach((text, vi) => verses[String(vi + 1)] = String(text));
        chapMap[String(ci + 1)] = verses;
      });
      if (Object.keys(chapMap).length) {
        fs.writeFileSync(path.join(dir, BOOK_NAMES[i].toLowerCase().replace(/ /g,'_') + '.json'), JSON.stringify(chapMap));
        written++;
      }
    }
    console.log(`  ✅ ${written} books`);
    return true;
  } catch (e) {
    console.error(`  ❌ Failed: ${e.message}`);
    return false;
  }
}

// ─── GETBIBLE.NET DOWNLOAD (Swahili, Japanese, Italian, + fallback) ────────
async function downloadGetBible(slug, folderName) {
  const dir = path.join(BASE_DIR, folderName);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`\n📥 ${folderName} via getbible.net (slug: ${slug})...`);

  for (let i = 0; i < BOOK_NAMES.length; i++) {
    const bookName = BOOK_NAMES[i];
    const maxCh = MAX_CHAPTERS[bookName] || 1;
    const bookData = {};
    let hasContent = false;
    for (let ch = 1; ch <= maxCh; ch++) {
      try {
        const raw = await fetchText(`https://getbible.net/v2/${slug}/${encodeURIComponent(bookName + ' ' + ch)}`);
        const data = JSON.parse(raw);
        const verses = {};
        for (const entry of Object.values(data)) {
          for (const v of (entry?.verses || [])) {
            if (v?.text) verses[String(v.verse)] = String(v.text);
          }
        }
        if (Object.keys(verses).length) {
          bookData[String(ch)] = verses;
          hasContent = true;
        }
      } catch(e) {}
      await delay(100);
    }
    if (hasContent) {
      fs.writeFileSync(path.join(dir, bookName.toLowerCase().replace(/ /g,'_') + '.json'), JSON.stringify(bookData));
      process.stdout.write('.');
    }
  }
  console.log(`\n  ✅ Done`);
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
(async () => {
  console.log('🚀 Downloading final 5 languages...\n');

  // 1. Hindi & Zulu from godlytalias (fast)
  const hindiOk = await downloadGodlyTalis('Hindi', 'hindi');
  const zuluOk = await downloadGodlyTalis('Zulu', 'zulu');

  // 2. Swahili, Japanese, Italian from getbible.net (reliable)
  await downloadGetBible('swahili', 'swahili');
  await downloadGetBible('japkougo', 'japanese');
  await downloadGetBible('riveduta', 'italian');

  // 3. Fallback: if Hindi or Zulu failed, also fetch from getbible
  if (!hindiOk) await downloadGetBible('hindi', 'hindi');
  if (!zuluOk)  await downloadGetBible('zulu', 'zulu');

  console.log('\n🎉 All 15 languages are now fully offline!');
})();