// script/download-all-languages.cjs
// Downloads the complete Bible for every language from bible-api.com (free, no key needed)
// Saves per‑book JSON files in public/bibles/<folder>/
// Usage: node script/download-all-languages.cjs

const https = require('https');
const fs = require('fs');
const path = require('path');

// Language codes supported by bible-api.com
const LANGUAGES = {
  swahili:          { code: 'swa', folder: 'swahili',          label: 'Swahili' },
  zulu:             { code: 'zu',  folder: 'zulu',             label: 'Zulu' },
  arabic:           { code: 'ar',  folder: 'arabic',           label: 'Arabic (SVD)' },
  chinese_cuv:      { code: 'zh',  folder: 'chinese_cuv',      label: 'Chinese (CUV)' },
  hindi:            { code: 'hi',  folder: 'hindi',            label: 'Hindi' },
  russian_synodal:  { code: 'ru',  folder: 'russian_synodal',  label: 'Russian' },
  italian:          { code: 'it',  folder: 'italian',          label: 'Italian' },
  german:           { code: 'de',  folder: 'german',           label: 'German' },
  japanese:         { code: 'ja',  folder: 'japanese',         label: 'Japanese' },
  french_lsg:       { code: 'fr',  folder: 'french_lsg',       label: 'French' },
  spanish_rv1960:   { code: 'es',  folder: 'spanish_rv1960',   label: 'Spanish' },
  portuguese_jfa:   { code: 'pt',  folder: 'portuguese_jfa',   label: 'Portuguese' },
};

// All 66 books (name, chapter count)
const BOOKS = [
  { name:'Genesis', chs:50 },{ name:'Exodus', chs:40 },{ name:'Leviticus', chs:27 },
  { name:'Numbers', chs:36 },{ name:'Deuteronomy', chs:34 },{ name:'Joshua', chs:24 },
  { name:'Judges', chs:21 },{ name:'Ruth', chs:4 },{ name:'1 Samuel', chs:31 },
  { name:'2 Samuel', chs:24 },{ name:'1 Kings', chs:22 },{ name:'2 Kings', chs:25 },
  { name:'1 Chronicles', chs:29 },{ name:'2 Chronicles', chs:36 },{ name:'Ezra', chs:10 },
  { name:'Nehemiah', chs:13 },{ name:'Esther', chs:10 },{ name:'Job', chs:42 },
  { name:'Psalms', chs:150 },{ name:'Proverbs', chs:31 },{ name:'Ecclesiastes', chs:12 },
  { name:'Song of Solomon', chs:8 },{ name:'Isaiah', chs:66 },{ name:'Jeremiah', chs:52 },
  { name:'Lamentations', chs:5 },{ name:'Ezekiel', chs:48 },{ name:'Daniel', chs:12 },
  { name:'Hosea', chs:14 },{ name:'Joel', chs:3 },{ name:'Amos', chs:9 },
  { name:'Obadiah', chs:1 },{ name:'Jonah', chs:4 },{ name:'Micah', chs:7 },
  { name:'Nahum', chs:3 },{ name:'Habakkuk', chs:3 },{ name:'Zephaniah', chs:3 },
  { name:'Haggai', chs:2 },{ name:'Zechariah', chs:14 },{ name:'Malachi', chs:4 },
  { name:'Matthew', chs:28 },{ name:'Mark', chs:16 },{ name:'Luke', chs:24 },
  { name:'John', chs:21 },{ name:'Acts', chs:28 },{ name:'Romans', chs:16 },
  { name:'1 Corinthians', chs:16 },{ name:'2 Corinthians', chs:13 },
  { name:'Galatians', chs:6 },{ name:'Ephesians', chs:6 },{ name:'Philippians', chs:4 },
  { name:'Colossians', chs:4 },{ name:'1 Thessalonians', chs:5 },
  { name:'2 Thessalonians', chs:3 },{ name:'1 Timothy', chs:6 },{ name:'2 Timothy', chs:4 },
  { name:'Titus', chs:3 },{ name:'Philemon', chs:1 },{ name:'Hebrews', chs:13 },
  { name:'James', chs:5 },{ name:'1 Peter', chs:5 },{ name:'2 Peter', chs:3 },
  { name:'1 John', chs:5 },{ name:'2 John', chs:1 },{ name:'3 John', chs:1 },
  { name:'Jude', chs:1 },{ name:'Revelation', chs:22 }
];

function apiFetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function downloadLanguage(key, config) {
  const dir = path.join(__dirname, '..', 'public', 'bibles', config.folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log(`\n📥 ${config.label} (${config.code})`);

  let bookCount = 0;
  for (const book of BOOKS) {
    const chapters = {};
    let success = false;

    for (let ch = 1; ch <= book.chs; ch++) {
      try {
        // bible-api.com expects the book name as-is (e.g., "1 Samuel 3")
        const url = `https://bible-api.com/${encodeURIComponent(book.name + ' ' + ch)}?translation=${config.code}`;
        const data = await apiFetch(url);
        const verses = data.verses || [];
        if (verses.length) {
          const verseMap = {};
          verses.forEach(v => { verseMap[String(v.verse)] = v.text; });
          chapters[String(ch)] = verseMap;
          success = true;
        }
        await delay(300); // be polite to the free API
      } catch (e) {
        console.warn(`   ⚠️ Failed ${book.name} ${ch}: ${e.message}`);
      }
    }

    if (success) {
      const fname = book.name.toLowerCase().replace(/ /g, '_') + '.json';
      fs.writeFileSync(path.join(dir, fname), JSON.stringify(chapters, null, 2), 'utf-8');
      bookCount++;
      process.stdout.write(`\r   ${bookCount} / ${BOOKS.length} books written`);
    }
  }
  console.log(`\n   ✅ ${config.label}: ${bookCount} books written`);
}

(async () => {
  console.log('📖 Downloading full Bibles from bible-api.com (free, no key)\n');
  console.log('   This will take a while (1,189 chapters per language)...\n');

  for (const [key, config] of Object.entries(LANGUAGES)) {
    await downloadLanguage(key, config);
  }

  console.log('\n🎉 All offline Bibles have been generated!');
  console.log('   Check public/bibles/ for the files.');
})();