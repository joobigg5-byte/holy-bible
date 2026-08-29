/**
 * Rebuild public/scribe-index.json from public/bibles/en_kjv.
 * Run after changing the English text:  node script/build-scribe-index.mjs
 *
 * The index stores only verse locations and token postings — never verse text —
 * so the Scribe can render results in whatever translation the reader picked.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'public/bibles/en_kjv';
const OUT = 'public/scribe-index.json';

const STOP = new Set(
  `a about above after again against all am an and any are as at be because been before being below
   between both but by cannot could did do does doing down during each few for from further had has
   have having he her here hers herself him himself his how i if in into is it its itself me more most
   my myself nor of off on once only or other ought our ours ourselves out over own same she should so
   some such than that the their theirs them themselves then there these they this those through to too
   under until up very was we were what when where which while who whom why with would you your yours
   yourself unto shall thou thee thy thine ye hath doth saith said say came come went let thus also
   upon even yet one two three man men day days thing things`.split(/\s+/),
);

const verses = {};
const postings = new Map();
let id = 0;

for (const file of readdirSync(SRC).sort()) {
  if (!file.endsWith('.json')) continue;
  const book = file.slice(0, -5).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const data = JSON.parse(readFileSync(join(SRC, file), 'utf8'));

  for (const ch of Object.keys(data).sort((a, b) => +a - +b)) {
    for (const v of Object.keys(data[ch]).sort((a, b) => +a - +b)) {
      verses[id] = `${book}|${ch}|${v}`;
      const tokens = new Set(
        (data[ch][v].toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => !STOP.has(w)),
      );
      for (const t of tokens) {
        if (!postings.has(t)) postings.set(t, []);
        postings.get(t).push(id);
      }
      id += 1;
    }
  }
}

// Drop tokens so common they carry no signal
const index = {};
for (const [token, ids] of postings) {
  if (ids.length <= 900) index[token] = ids;
}

writeFileSync(OUT, JSON.stringify({ verses, index }));
console.log(`indexed ${id} verses, ${Object.keys(index).length} tokens -> ${OUT}`);
