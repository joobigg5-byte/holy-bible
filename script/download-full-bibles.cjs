// script/download-from-apibible.cjs
// Fetches the complete Bible for each required language from API.Bible
// and saves them as per‑book JSON files in public/bibles/<folder>/
// Usage: node script/download-from-apibible.cjs

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'iLGcKs0GNbXll8M87jhJv';  // Your key
const API_BASE = 'https://rest.api.bible/v1';

// Languages that need offline files (Twi & Yoruba are already done)
const LANGUAGES = {
  swa: { iso: 'swa', folder: 'swahili',          label: 'Swahili' },
  zul: { iso: 'zul', folder: 'zulu',             label: 'Zulu' },
  svd: { iso: 'ara', folder: 'arabic',           label: 'Arabic' },
  chi: { iso: 'zho', folder: 'chinese_cuv',      label: 'Chinese' },
  hin: { iso: 'hin', folder: 'hindi',            label: 'Hindi' },
  rus: { iso: 'rus', folder: 'russian_synodal',  label: 'Russian' },
  ita: { iso: 'ita', folder: 'italian',          label: 'Italian' },
  deu: { iso: 'deu', folder: 'german',           label: 'German' },
  jpn: { iso: 'jpn', folder: 'japanese',         label: 'Japanese' },
  fra: { iso: 'fra', folder: 'french_lsg',       label: 'French' },
  spa: { iso: 'spa', folder: 'spanish_rv1960',   label: 'Spanish' },
  por: { iso: 'por', folder: 'portuguese_jfa',   label: 'Portuguese' },
};

// Book abbreviations for API.Bible
const BOOKS = [
  { name: 'Genesis', abbr: 'GEN', chs: 50 }, { name: 'Exodus', abbr: 'EXO', chs: 40 },
  { name: 'Leviticus', abbr: 'LEV', chs: 27 }, { name: 'Numbers', abbr: 'NUM', chs: 36 },
  { name: 'Deuteronomy', abbr: 'DEU', chs: 34 }, { name: 'Joshua', abbr: 'JOS', chs: 24 },
  { name: 'Judges', abbr: 'JDG', chs: 21 }, { name: 'Ruth', abbr: 'RUT', chs: 4 },
  { name: '1 Samuel', abbr: '1SA', chs: 31 }, { name: '2 Samuel', abbr: '2SA', chs: 24 },
  { name: '1 Kings', abbr: '1KI', chs: 22 }, { name: '2 Kings', abbr: '2KI', chs: 25 },
  { name: '1 Chronicles', abbr: '1CH', chs: 29 }, { name: '2 Chronicles', abbr: '2CH', chs: 36 },
  { name: 'Ezra', abbr: 'EZR', chs: 10 }, { name: 'Nehemiah', abbr: 'NEH', chs: 13 },
  { name: 'Esther', abbr: 'EST', chs: 10 }, { name: 'Job', abbr: 'JOB', chs: 42 },
  { name: 'Psalms', abbr: 'PSA', chs: 150 }, { name: 'Proverbs', abbr: 'PRO', chs: 31 },
  { name: 'Ecclesiastes', abbr: 'ECC', chs: 12 }, { name: 'Song of Solomon', abbr: 'SNG', chs: 8 },
  { name: 'Isaiah', abbr: 'ISA', chs: 66 }, { name: 'Jeremiah', abbr: 'JER', chs: 52 },
  { name: 'Lamentations', abbr: 'LAM', chs: 5 }, { name: 'Ezekiel', abbr: 'EZK', chs: 48 },
  { name: 'Daniel', abbr: 'DAN', chs: 12 }, { name: 'Hosea', abbr: 'HOS', chs: 14 },
  { name: 'Joel', abbr: 'JOL', chs: 3 }, { name: 'Amos', abbr: 'AMO', chs: 9 },
  { name: 'Obadiah', abbr: 'OBA', chs: 1 }, { name: 'Jonah', abbr: 'JON', chs: 4 },
  { name: 'Micah', abbr: 'MIC', chs: 7 }, { name: 'Nahum', abbr: 'NAM', chs: 3 },
  { name: 'Habakkuk', abbr: 'HAB', chs: 3 }, { name: 'Zephaniah', abbr: 'ZEP', chs: 3 },
  { name: 'Haggai', abbr: 'HAG', chs: 2 }, { name: 'Zechariah', abbr: 'ZEC', chs: 14 },
  { name: 'Malachi', abbr: 'MAL', chs: 4 },
  { name: 'Matthew', abbr: 'MAT', chs: 28 }, { name: 'Mark', abbr: 'MRK', chs: 16 },
  { name: 'Luke', abbr: 'LUK', chs: 24 }, { name: 'John', abbr: 'JHN', chs: 21 },
  { name: 'Acts', abbr: 'ACT', chs: 28 }, { name: 'Romans', abbr: 'ROM', chs: 16 },
  { name: '1 Corinthians', abbr: '1CO', chs: 16 }, { name: '2 Corinthians', abbr: '2CO', chs: 13 },
  { name: 'Galatians', abbr: 'GAL', chs: 6 }, { name: 'Ephesians', abbr: 'EPH', chs: 6 },
  { name: 'Philippians', abbr: 'PHP', chs: 4 }, { name: 'Colossians', abbr: 'COL', chs: 4 },
  { name: '1 Thessalonians', abbr: '1TH', chs: 5 }, { name: '2 Thessalonians', abbr: '2TH', chs: 3 },
  { name: '1 Timothy', abbr: '1TI', chs: 6 }, { name: '2 Timothy', abbr: '2TI', chs: 4 },
  { name: 'Titus', abbr: 'TIT', chs: 3 }, { name: 'Philemon', abbr: 'PHM', chs: 1 },
  { name: 'Hebrews', abbr: 'HEB', chs: 13 }, { name: 'James', abbr: 'JAS', chs: 5 },
  { name: '1 Peter', abbr: '1PE', chs: 5 }, { name: '2 Peter', abbr: '2PE', chs: 3 },
  { name: '1 John', abbr: '1JN', chs: 5 }, { name: '2 John', abbr: '2JN', chs: 1 },
  { name: '3 John', abbr: '3JN', chs: 1 }, { name: 'Jude', abbr: 'JUD', chs: 1 },
  { name: 'Revelation', abbr: 'REV', chs: 22 },
];

function apiFetch(urlPath) {
  return new Promise((resolve, reject) => {
    https.get(
      `${API_BASE}${urlPath}`,
      { headers: { 'api-key': API_KEY } },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
        });
      }
    ).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getBibleId(iso) {
  const data = await apiFetch(`/bibles?language=${iso}&limit=3`);
  if (data?.data?.length) return data.data[0].id;
  return null;
}

async function downloadLanguage(lc) {
  const folder = path.join(__dirname, '..', 'public', 'bibles', lc.folder);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  console.log(`\n📥 ${lc.label} (ISO: ${lc.iso})`);

  const bibleId = await getBibleId(lc.iso);
  if (!bibleId) {
    console.error(`   ❌ No Bible found for ISO ${lc.iso}`);
    return;
  }
  console.log(`   Using Bible ID: ${bibleId}`);

  let bookCount = 0;
  for (const book of BOOKS) {
    const bookData = {};
    let success = false;

    for (let ch = 1; ch <= book.chs; ch++) {
      try {
        const url = `/bibles/${bibleId}/chapters/${book.abbr}.${ch}?content-type=text`;
        const data = await apiFetch(url);
        const rawText = data?.data?.content;
        if (!rawText) continue;

        const verses = {};
        const lines = rawText.split(/\r?\n/);
        let curV = 0, txt = '';
        for (const line of lines) {
          const m = line.match(/^(\d+)\s+(.*)/);
          if (m) {
            if (curV > 0 && txt.trim()) verses[String(curV)] = txt.trim();
            curV = parseInt(m[1]);
            txt = m[2];
          } else if (curV > 0) {
            txt += ' ' + line.trim();
          }
        }
        if (curV > 0 && txt.trim()) verses[String(curV)] = txt.trim();

        if (Object.keys(verses).length) {
          bookData[String(ch)] = verses;
          success = true;
        }

        await delay(200); // polite rate limit
      } catch (e) {
        console.warn(`   ⚠️ Failed ${book.abbr} ${ch}: ${e.message}`);
      }
    }

    if (success) {
      const fname = book.name.toLowerCase().replace(/ /g, '_') + '.json';
      fs.writeFileSync(path.join(folder, fname), JSON.stringify(bookData, null, 2));
      bookCount++;
      process.stdout.write(`\r   ${bookCount} / ${BOOKS.length} books written`);
    }
  }
  console.log(`\n   ✅ Finished ${lc.label}: ${bookCount} books`);
}

(async () => {
  console.log('📖 Downloading full Bibles from API.Bible (this will take a while)...\n');
  for (const [key, lc] of Object.entries(LANGUAGES)) {
    await downloadLanguage(lc);
  }
  console.log('\n🎉 All offline Bibles have been generated!');
})();