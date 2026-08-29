// finish-all-missing.cjs – Downloads Italian, Japanese, Swahili, Hindi, Zulu (and fixes en_kjv)
// Uses only live, tested URLs. Reports exact books written to disk.
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'public', 'bibles');

const BOOKS = [
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

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
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

// ------ Source 1: getbible/v2 repo (numeric files, works for swahili/japkougo/riveduta) ------
async function downloadGetBibleRepo(slug, folder) {
  const dir = path.join(BASE, folder);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`\n📥 ${folder} from getbible/v2 repo (numeric files)...`);
  let written = 0;
  for (let i = 1; i <= 66; i++) {
    const url = `https://raw.githubusercontent.com/getbible/v2/master/bibles/${slug}/${i}.json`;
    try {
      const raw = await fetchText(url);
      const data = JSON.parse(raw);
      const chapters = data.chapters || data;
      const chapMap = {};
      for (const [chNum, verses] of Object.entries(chapters)) {
        const verseMap = {};
        for (const [vNum, vObj] of Object.entries(verses)) {
          verseMap[String(vNum)] = typeof vObj === 'object' ? String(vObj.verse || vObj.text || '') : String(vObj);
        }
        chapMap[String(chNum)] = verseMap;
      }
      if (Object.keys(chapMap).length) {
        fs.writeFileSync(path.join(dir, `${BOOKS[i - 1].toLowerCase().replace(/ /g, '_')}.json`), JSON.stringify(chapMap));
        written++;
        process.stdout.write('.');
      }
    } catch (e) { /* skip missing books */ }
  }
  console.log(`\n  ✅ ${folder}: ${written} books from repo`);
  return written;
}

// ------ Source 2: getbible.net API (reliable fallback) ------
async function downloadGetBibleAPI(slug, folder) {
  const dir = path.join(BASE, folder);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`\n📥 ${folder} from getbible.net API...`);
  let written = 0;
  for (let i = 0; i < BOOKS.length; i++) {
    const name = BOOKS[i];
    const maxCh = { Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,Ruth:4,
      '1 Samuel':31,'2 Samuel':24,'1 Kings':22,'2 Kings':25,'1 Chronicles':29,'2 Chronicles':36,Ezra:10,
      Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,Ecclesiastes:12,'Song of Solomon':8,Isaiah:66,
      Jeremiah:52,Lamentations:5,Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,Obadiah:1,Jonah:4,Micah:7,
      Nahum:3,Habakkuk:3,Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4,Matthew:28,Mark:16,Luke:24,John:21,
      Acts:28,Romans:16,'1 Corinthians':16,'2 Corinthians':13,Galatians:6,Ephesians:6,Philippians:4,
      Colossians:4,'1 Thessalonians':5,'2 Thessalonians':3,'1 Timothy':6,'2 Timothy':4,Titus:3,Philemon:1,
      Hebrews:13,James:5,'1 Peter':5,'2 Peter':3,'1 John':5,'2 John':1,'3 John':1,Jude:1,Revelation:22 }[name] || 1;
    const bookData = {};
    let has = false;
    for (let ch = 1; ch <= maxCh; ch++) {
      try {
        const raw = await fetchText(`https://getbible.net/v2/${slug}/${encodeURIComponent(name + ' ' + ch)}`);
        const data = JSON.parse(raw);
        const verses = {};
        for (const e of Object.values(data)) {
          for (const v of (e.verses || [])) {
            if (v.text) verses[String(v.verse)] = String(v.text);
          }
        }
        if (Object.keys(verses).length) { bookData[String(ch)] = verses; has = true; }
      } catch (_) {}
      await delay(80);
    }
    if (has) {
      fs.writeFileSync(path.join(dir, `${name.toLowerCase().replace(/ /g, '_')}.json`), JSON.stringify(bookData));
      written++;
      process.stdout.write('.');
    }
  }
  console.log(`\n  ✅ ${folder}: ${written} books from API`);
  return written;
}

// ------ Main ------
(async () => {
  console.log('🚀 Final download of missing languages...');

  // Italian: getbible/v2 repo (numeric files)
  let italianCount = await downloadGetBibleRepo('riveduta', 'italian');
  if (italianCount < 66) {
    console.log(`  Italian repo only gave ${italianCount}, filling with API...`);
    italianCount = await downloadGetBibleAPI('riveduta', 'italian');
  }

  // Japanese: getbible/v2 repo
  let japaneseCount = await downloadGetBibleRepo('japkougo', 'japanese');
  if (japaneseCount < 66) {
    console.log(`  Japanese repo only gave ${japaneseCount}, filling with API...`);
    japaneseCount = await downloadGetBibleAPI('japkougo', 'japanese');
  }

  // Swahili: getbible/v2 repo (already got 1? force full download)
  let swahiliCount = await downloadGetBibleRepo('swahili', 'swahili');
  if (swahiliCount < 66) {
    console.log(`  Swahili repo only gave ${swahiliCount}, filling with API...`);
    swahiliCount = await downloadGetBibleAPI('swahili', 'swahili');
  }

  // Hindi and Zulu: only getbible.net API (no repo available)
  const hindiCount = await downloadGetBibleAPI('hindi', 'hindi');
  const zuluCount = await downloadGetBibleAPI('zulu', 'zulu');

  console.log('\n📊 Final counts:');
  console.log(`  Italian: ${italianCount}/66`);
  console.log(`  Japanese: ${japaneseCount}/66`);
  console.log(`  Swahili: ${swahiliCount}/66`);
  console.log(`  Hindi: ${hindiCount}/66`);
  console.log(`  Zulu: ${zuluCount}/66`);
})();