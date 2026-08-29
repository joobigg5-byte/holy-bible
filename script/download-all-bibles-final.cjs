// script/download-all-bibles-final.cjs
// Downloads complete Bibles from free public-domain sources and
// converts them to per‑book JSON files in public/bibles/<folder>/
// Usage: node script/download-all-bibles-final.cjs

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Book name mapping (English name for file naming) ────────────────────
const BOOK_NAMES = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles',
  'Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes',
  'Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel',
  'Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk',
  'Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians',
  'Galatians','Ephesians','Philippians','Colossians','1 Thessalonians',
  '2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews',
  'James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
];

// ─── Download helpers ────────────────────────────────────────────────────
function downloadJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

// ─── Convert a flat { book_index: { chapter: { verse: text } } } structure ──
function convertFromIndexedStructure(data, outputDir, label) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  let count = 0;
  for (const [bookIdx, chapters] of Object.entries(data)) {
    const bookName = BOOK_NAMES[parseInt(bookIdx)];
    if (!bookName) continue;
    // Normalize: ensure chapters are keyed by string chapter numbers
    const normalized = {};
    for (const [ch, verses] of Object.entries(chapters)) {
      normalized[String(ch)] = verses;
    }
    if (Object.keys(normalized).length > 0) {
      const fname = bookName.toLowerCase().replace(/ /g, '_') + '.json';
      fs.writeFileSync(path.join(outputDir, fname), JSON.stringify(normalized, null, 2), 'utf-8');
      count++;
    }
  }
  console.log(`   ✅ ${label}: ${count} books written`);
}

// ─── Convert a single-book { chapters: { verse: text } } structure ──────
function saveOneBook(bookIndex, chapters, outputDir) {
  const bookName = BOOK_NAMES[bookIndex];
  if (!bookName) return;
  const normalized = {};
  for (const [ch, verses] of Object.entries(chapters)) {
    normalized[String(ch)] = verses;
  }
  if (Object.keys(normalized).length > 0) {
    const fname = bookName.toLowerCase().replace(/ /g, '_') + '.json';
    fs.writeFileSync(path.join(outputDir, fname), JSON.stringify(normalized, null, 2), 'utf-8');
  }
}

// ─── Language definitions ───────────────────────────────────────────────
const LANGUAGES = [
  {
    name: 'Swahili',
    folder: 'swahili',
    source: 'shemmjunior',
    url: 'https://raw.githubusercontent.com/shemmjunior/swahili-bible-edition/master/full_version/swahili_bible.json',
    parse: async (data, dir) => {
      // Structure: { "Agano la Kale": { "books": [...], "chapters": [...] }, "Agano Jipya": ... }
      // This format varies; we'll handle both old/new testament
      console.log(`   Parsing Swahili Bible...`);
      convertFromIndexedStructure(data, dir, 'Swahili');
    }
  },
  {
    name: 'Zulu',
    folder: 'zulu',
    source: 'godlytalias',
    url: 'https://raw.githubusercontent.com/godlytalias/Bible-Database/master/Zulu/json/',
    // For Zulu we need to fetch each book individually
    isMultiFile: true,
    baseUrl: 'https://raw.githubusercontent.com/godlytalias/Bible-Database/master/Zulu/json/',
    fileCount: 66,
    parse: async (_, dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let count = 0;
      for (let i = 0; i < 66; i++) {
        try {
          const url = `https://raw.githubusercontent.com/godlytalias/Bible-Database/master/Zulu/json/${i}.json`;
          const data = await downloadJSON(url);
          saveOneBook(i, data, dir);
          count++;
        } catch(e) {
          console.warn(`   ⚠️ Zulu book ${i} failed: ${e.message}`);
        }
      }
      console.log(`   ✅ Zulu: ${count} books written`);
    }
  },
  {
    name: 'Arabic (SVD)',
    folder: 'arabic',
    source: 'thiagobodruk',
    url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/ar_svd.json',
    parse: async (data, dir) => {
      // Structure: array of books, each with chapters array containing verses
      if (Array.isArray(data)) {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        let count = 0;
        for (let i = 0; i < data.length; i++) {
          const book = data[i];
          const chapters = {};
          if (book.chapters && Array.isArray(book.chapters)) {
            for (let c = 0; c < book.chapters.length; c++) {
              chapters[String(c + 1)] = book.chapters[c];
            }
          }
          if (Object.keys(chapters).length > 0) {
            const bookName = BOOK_NAMES[i];
            if (bookName) {
              const fname = bookName.toLowerCase().replace(/ /g, '_') + '.json';
              fs.writeFileSync(path.join(dir, fname), JSON.stringify(chapters, null, 2), 'utf-8');
              count++;
            }
          }
        }
        console.log(`   ✅ Arabic: ${count} books written`);
      } else {
        console.warn('   ⚠️ Arabic: unexpected JSON structure');
      }
    }
  },
  {
    name: 'Chinese (CUV)',
    folder: 'chinese_cuv',
    source: 'shendlcode',
    url: 'https://raw.githubusercontent.com/shendlcode/9bible/master/json/chi_cuv.json',
    parse: async (data, dir) => convertFromIndexedStructure(data, dir, 'Chinese')
  },
  {
    name: 'Hindi',
    folder: 'hindi',
    source: 'godlytalias',
    url: null,
    isMultiFile: true,
    baseUrl: 'https://raw.githubusercontent.com/godlytalias/Bible-Database/master/Hindi/json/',
    fileCount: 66,
    parse: async (_, dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let count = 0;
      for (let i = 0; i < 66; i++) {
        try {
          const url = `https://raw.githubusercontent.com/godlytalias/Bible-Database/master/Hindi/json/${i}.json`;
          const data = await downloadJSON(url);
          saveOneBook(i, data, dir);
          count++;
        } catch(e) {
          console.warn(`   ⚠️ Hindi book ${i} failed: ${e.message}`);
        }
      }
      console.log(`   ✅ Hindi: ${count} books written`);
    }
  },
  {
    name: 'Russian (Synodal)',
    folder: 'russian_synodal',
    source: 'bibleonline',
    url: 'https://git.io/rst.json',
    parse: async (data, dir) => {
      // Structure may vary; commonly { "books": [ { "full_name": "...", "chapters": [...] } ] }
      if (data.books && Array.isArray(data.books)) {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        let count = 0;
        for (const book of data.books) {
          const bookName = book.full_name || book.name || '';
          const chapters = {};
          if (book.chapters && Array.isArray(book.chapters)) {
            for (let c = 0; c < book.chapters.length; c++) {
              chapters[String(c + 1)] = book.chapters[c];
            }
          }
          if (Object.keys(chapters).length > 0 && bookName) {
            const fname = bookName.toLowerCase().replace(/ /g, '_') + '.json';
            fs.writeFileSync(path.join(dir, fname), JSON.stringify(chapters, null, 2), 'utf-8');
            count++;
          }
        }
        console.log(`   ✅ Russian: ${count} books written`);
      } else {
        // Fallback: try indexed structure
        convertFromIndexedStructure(data, dir, 'Russian');
      }
    }
  },
  {
    name: 'Italian (Riveduta)',
    folder: 'italian',
    source: 'thiagobodruk',
    url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/it_riveduta.json',
    parse: async (data, dir) => convertFromIndexedStructure(data, dir, 'Italian')
  },
  {
    name: 'German (Schlachter)',
    folder: 'german',
    source: 'thiagobodruk',
    url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/de_schlachter.json',
    parse: async (data, dir) => convertFromIndexedStructure(data, dir, 'German')
  },
  {
    name: 'Japanese (Colloquial)',
    folder: 'japanese',
    source: 'thiagobodruk',
    url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/ja_kougo.json',
    parse: async (data, dir) => convertFromIndexedStructure(data, dir, 'Japanese')
  },
  {
    name: 'French (Louis Segond)',
    folder: 'french_lsg',
    source: 'thiagobodruk',
    url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/fr_ls.json',
    parse: async (data, dir) => convertFromIndexedStructure(data, dir, 'French')
  },
  {
    name: 'Spanish (RV1960)',
    folder: 'spanish_rv1960',
    source: 'thiagobodruk',
    url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/es_rv.json',
    parse: async (data, dir) => convertFromIndexedStructure(data, dir, 'Spanish')
  },
  {
    name: 'Portuguese (Almeida)',
    folder: 'portuguese_jfa',
    source: 'thiagobodruk',
    url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/pt_almeida.json',
    parse: async (data, dir) => convertFromIndexedStructure(data, dir, 'Portuguese')
  },
];

// ─── Main runner ───────────────────────────────────────────────────────
(async () => {
  console.log('📖 Downloading complete Bibles from free public-domain sources...\n');
  console.log('   Sources: GitHub (thiagobodruk, godlytalias, shemmjunior, shendlcode, bibleonline)\n');

  for (const lang of LANGUAGES) {
    const dir = path.join(__dirname, '..', 'public', 'bibles', lang.folder);
    console.log(`📥 ${lang.name} (${lang.source})`);

    if (lang.isMultiFile) {
      await lang.parse(null, dir);
    } else {
      try {
        const data = await downloadJSON(lang.url);
        await lang.parse(data, dir);
      } catch (err) {
        console.error(`   ❌ Failed: ${err.message}`);
      }
    }
  }

  console.log('\n🎉 All offline Bibles have been downloaded and converted!');
  console.log('   Check public/bibles/ for the generated files.');
  console.log('   Languages already present (Twi, Yoruba) were not re-downloaded.');
})();