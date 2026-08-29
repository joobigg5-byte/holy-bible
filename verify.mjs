/**
 * Run this from the project root:  node verify.mjs
 * It tells you whether you have the full build, and what is missing if not.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const count = (p) => (existsSync(p) ? readdirSync(p).filter(f => f.endsWith('.json') && !f.startsWith('_')).length : 0);
const ok = (b) => (b ? '  OK   ' : '  MISS ');
let missing = 0;
const check = (label, pass, detail = '') => {
  if (!pass) missing++;
  console.log(ok(pass) + label.padEnd(34) + detail);
};

console.log('\n--- CODE ---');
for (const [label, path] of [
  ['Library hub',            'src/components/LibraryPanel.tsx'],
  ['Verse study sheet',      'src/components/VerseStudy.tsx'],
  ['Reader settings',        'src/components/ReaderSettings.tsx'],
  ['Sources / attribution',  'src/components/Attribution.tsx'],
  ['Full-text search',       'src/services/bibleSearch.ts'],
  ['Cross-references',       'src/services/crossRefs.ts'],
  ['Dictionary + places',    'src/services/reference.ts'],
  ['Commentary + devotional','src/services/commentary.ts'],
  ['Hymns',                  'src/services/hymns.ts'],
  ['Parallel reading',       'src/services/parallelReading.ts'],
  ['Gospel path',            'src/services/gospelPath.ts'],
  ['Teachings',              'src/services/teachings.ts'],
  ['Church year',            'src/services/churchYear.ts'],
  ['Export / restore',       'src/services/userData.ts'],
  ['Speech engine',          'src/lib/speech.ts'],
  ['Sleep timer',            'src/hooks/useSleepTimer.ts'],
  ['Text size',              'src/hooks/useTextSize.ts'],
]) check(label, existsSync(path));

console.log('\n--- DATA ---');
const langs = existsSync('public/bibles')
  ? readdirSync('public/bibles').filter(d => !['apocrypha_kjv','ancient_texts'].includes(d)) : [];
check('Bible translations', langs.length >= 17, `${langs.length} found (expect 17)`);
check('Apocrypha',          count('public/bibles/apocrypha_kjv') >= 15, `${count('public/bibles/apocrypha_kjv')} books`);
check('Ancient writings',   count('public/bibles/ancient_texts') >= 19, `${count('public/bibles/ancient_texts')} works`);
check('Commentary',         count('public/commentary/matthew_henry') >= 66, `${count('public/commentary/matthew_henry')} books`);
check('Dictionary',         existsSync('public/dictionary/_index.json'));
check('Cross-references',   existsSync('public/cross-references.json'));
check('Search index',       existsSync('public/scribe-index.json'));
check('Hymns',              existsSync('public/hymns/hymns.json'));
check('Spurgeon',           existsSync('public/devotionals/spurgeon.json'));
check('Places',             existsSync('public/places/places.json'));
check('Gospel path',        existsSync('public/gospel/path.json'));
check('Icons',              existsSync('public/icons/icon-512.png'));
check('SPA redirects',      existsSync('public/_redirects'));

console.log('\n--- WIRED INTO THE UI ---');
const idx = existsSync('src/pages/Index.tsx') ? readFileSync('src/pages/Index.tsx','utf8') : '';
const read = existsSync('src/pages/ReadBible.tsx') ? readFileSync('src/pages/ReadBible.tsx','utf8') : '';
check('Library opens the hub', idx.includes('LibraryPanel'));
check('Settings shows sources', idx.includes('Attribution'));
check('Settings has reader prefs', idx.includes('ReaderSettings'));
check('Verse tap opens study', read.includes('VerseStudy'));
check('Parallel columns render', read.includes('loadParallelChapter'));
check('Sleep timer on audio', read.includes('useSleepTimer'));

if (existsSync('src/data/lectionary.ts')) {
  const days = (readFileSync('src/data/lectionary.ts','utf8').match(/\/\/ Day /g) || []).length;
  check('365-day lectionary', days >= 365, `${days} days`);
} else check('365-day lectionary', false);

console.log(
  missing === 0
    ? '\nCOMPLETE — this is the full build.\n'
    : `\nINCOMPLETE — ${missing} item(s) missing. You are running an older copy.\n`,
);
