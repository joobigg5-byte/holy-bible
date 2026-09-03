import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, Search as SearchIcon, BookMarked, MapPin, Music,
  Sunrise, ScrollText, FileText, Loader2, ExternalLink,
  Heart, Quote as QuoteIcon, Download, Upload, Play, Square, Projector, ListTree, Type,
  TrendingUp, HandHeart, CalendarRange, Check, Trash2, RotateCcw,
} from 'lucide-react';

import { searchBible, parseReference, type SearchResult } from '@/services/bibleSearch';
import {
  searchDictionary, lookupWord, loadPlaces, searchPlaces, mapLink,
  certaintyMeaning, type DictionaryEntry, type Place,
} from '@/services/reference';
import { getHymns, searchHymns, getHymnOfDay, hymnToSpeech, type Hymn } from '@/services/hymns';
import { getTune, playTune, stopTune, partsAvailable, PART_ORDER,
  type Tune, type PartName } from '@/services/tunePlayer';
import { getDevotional, type Devotional } from '@/services/commentary';
import { EXTRA_COLLECTIONS, loadCollection, type ExtraWork } from '@/data/extraCanon';
import { getWatchPeriod } from '@/data/lectionary';
import { useVerseSpeech } from '@/hooks/useVerseSpeech';
import { loadPath, resolveStage, loadTranslation, isTrustworthy,
  getDecision, recordDecision, type GospelPath, type ResolvedVerse } from '@/services/gospelPath';
import { loadTeachings, getQuotes, getOwnQuotes, saveOwnQuote,
  type Quote, type Theme } from '@/services/teachings';
import { exportJson, exportMarkdown, restoreBackup } from '@/services/userData';
import { getDayInfo } from '@/services/churchYear';
import { HEBREW, GREEK } from '@/data/alphabets';
import { searchTopics, getTopic, resolveEntry, SUGGESTED,
  type TopicSummary, type Topic, type TopicVerse } from '@/services/topical';
import { getSummary, bookProgress, recentDays, getLog } from '@/services/progress';
import { getPrayers, addPrayer, markAnswered, reopenPrayer, deletePrayer,
  daysCarried, type Prayer } from '@/services/prayers';
import { PLANS, getPlanState, startPlan, advancePlan, stopPlan,
  formatReading, type PlanState } from '@/services/readingPlans';
import type { LanguageCode } from '@/data/languages';

type View = 'menu' | 'project' | 'topical' | 'alphabet' | 'search' | 'dictionary' | 'places' | 'hymns' | 'devotional' | 'extra' | 'gospel' | 'teachings' | 'backup' | 'progress' | 'prayers' | 'plans';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  onOpenPassage?: (book: string, chapter: number) => void;
}

const SHELVES: Array<{ id: View; icon: typeof SearchIcon; title: string; note: string }> = [
  { id: 'search',     icon: SearchIcon,  title: 'Search the Scriptures', note: 'Every verse, by word or reference' },
  { id: 'topical',    icon: ListTree,    title: 'Topical Bible',         note: "Nave's · 5,320 subjects, every passage" },
  { id: 'dictionary', icon: BookMarked,  title: 'Bible Dictionary',      note: "Easton's and Smith's · 5,742 entries" },
  { id: 'alphabet',   icon: Type,        title: 'Hebrew and Greek',      note: 'The letters, and where they came from' },
  { id: 'places',     icon: MapPin,      title: 'Places, Then and Now',  note: 'Where the cities of scripture stand today' },
  { id: 'hymns',      icon: Music,       title: 'Hymns',                 note: '567 hymns · 279 in four parts' },
  { id: 'devotional', icon: Sunrise,     title: 'Morning and Evening',   note: 'Spurgeon, for every day of the year' },
  { id: 'extra',      icon: ScrollText,  title: 'Other Writings',        note: 'The Apocrypha and the ancient books' },
  { id: 'teachings',  icon: QuoteIcon,       title: 'Wisdom and Teaching',   note: 'From the preachers of the church' },
  { id: 'gospel',     icon: Heart,       title: 'Coming to Christ',      note: 'If you have never taken this step' },
  { id: 'project',    icon: Projector,   title: 'Project a Verse',       note: 'For preaching — follows what is spoken' },
  { id: 'plans',      icon: CalendarRange, title: 'Reading Plans',       note: 'The whole Bible in a year, and others' },
  { id: 'progress',   icon: TrendingUp,  title: 'Your Progress',         note: 'What you have read, and when' },
  { id: 'prayers',    icon: HandHeart,   title: 'Prayer List',           note: 'Requests, and answers when they come' },
  { id: 'backup',     icon: Download,    title: 'Save Your Work',        note: 'Export your notes and highlights' },
];

/* ── shared bits, all in the app's own idiom ───────────────────────────── */

const Field = ({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) => (
  <div className="relative mb-5">
    <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-muted/40" />
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border border-gold-dark rounded pl-9 pr-3 py-2 text-sm
                 text-gold-metallic placeholder:text-gold-muted/30
                 focus:outline-none focus:border-gold-muted transition-colors"
    />
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-center text-gold-muted/40 text-xs italic mt-10">{children}</p>
);

const Spinner = () => (
  <div className="flex justify-center mt-10">
    <Loader2 size={16} className="animate-spin text-gold-muted/50" />
  </div>
);

/* ── search ────────────────────────────────────────────────────────────── */

function SearchView({ language, onOpenPassage }: {
  language: LanguageCode; onOpenPassage?: (b: string, c: number) => void;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [jump, setJump] = useState<{ book: string; chapter: number } | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setRows([]); setJump(null); return; }
    const ref = parseReference(q);
    setJump(ref ? { book: ref.book, chapter: ref.chapter } : null);
    const t = setTimeout(async () => {
      setBusy(true);
      setRows(await searchBible(q, language, 40));
      setBusy(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, language]);

  return (
    <>
      <Field value={q} onChange={setQ} placeholder="A phrase, or John 3:16…" />

      {jump && (
        <button
          onClick={() => onOpenPassage?.(jump.book, jump.chapter)}
          className="w-full text-left mb-5 px-4 py-3 border border-gold-dark rounded
                     hover:border-gold-muted transition-colors"
        >
          <p className="text-gold-bright text-sm">
            {jump.book === 'Psalms' ? 'Psalm' : jump.book} {jump.chapter}
          </p>
          <p className="text-gold-muted/50 text-[11px] mt-0.5">Open this chapter</p>
        </button>
      )}

      {busy && <Spinner />}

      {!busy && rows.length > 0 && (
        <p className="text-gold-muted/40 text-[10px] tracking-widest uppercase mb-3">
          {rows.length} result{rows.length === 1 ? '' : 's'}
        </p>
      )}

      <div className="space-y-4">
        {rows.map((r, i) => (
          <button
            key={i}
            onClick={() => onOpenPassage?.(r.book, r.chapter)}
            className="block w-full text-left group"
          >
            <p className="text-gold-muted/60 text-[11px] tracking-wide mb-1 group-hover:text-gold-bright transition-colors">
              {r.reference}
              {r.exact && <span className="ml-2 text-gold-bright/70">exact</span>}
            </p>
            <p className="text-gold-metallic text-sm leading-relaxed">{r.text}</p>
          </button>
        ))}
      </div>

      {!busy && q.trim().length >= 2 && !rows.length && !jump && (
        <Empty>Nothing found for those words.</Empty>
      )}
    </>
  );
}

/* ── dictionary ────────────────────────────────────────────────────────── */

function DictionaryView() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Array<{ s: string; n: string }>>([]);
  const [open, setOpen] = useState<DictionaryEntry | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => setHits(await searchDictionary(q, 40)), 200);
    return () => clearTimeout(t);
  }, [q]);

  if (open) {
    return (
      <>
        <button
          onClick={() => setOpen(null)}
          className="flex items-center gap-1 text-gold-muted/60 hover:text-gold-bright text-xs mb-5 transition-colors"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <h3 className="font-book-name text-gold-bright text-lg mb-5">{open.name}</h3>
        <div className="space-y-5">
          {open.definitions.map((d, i) => (
            <div key={i}>
              <p className="text-gold-muted/40 text-[10px] tracking-widest uppercase mb-1.5">
                {d.source === 'EAS' ? "Easton's, 1897" : d.source === 'SMI' ? "Smith's, 1884" : d.source}
              </p>
              <p className="text-gold-metallic text-sm leading-relaxed">{d.text}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Field value={q} onChange={setQ} placeholder="A word — ephod, manna, centurion…" />
      <div className="space-y-1">
        {hits.map((h) => (
          <button
            key={h.s}
            onClick={async () => setOpen(await lookupWord(h.s))}
            className="block w-full text-left px-3 py-2.5 border-b border-gold-dark/30
                       text-gold-metallic text-sm hover:text-gold-bright transition-colors"
          >
            {h.n}
          </button>
        ))}
      </div>
      {q.trim().length >= 2 && !hits.length && <Empty>No entry under that word.</Empty>}
      {q.trim().length < 2 && <Empty>5,742 entries. Begin typing.</Empty>}
    </>
  );
}

/* ── places ────────────────────────────────────────────────────────────── */

const CERTAINTY_LABEL: Record<string, string> = {
  identified: 'Identified',
  continuous: 'Still inhabited',
  traditional: 'Traditional site',
  disputed: 'Disputed',
  unknown: 'Location unknown',
};

function PlacesView() {
  const [q, setQ] = useState('');
  const [all, setAll] = useState<Place[]>([]);
  const [rows, setRows] = useState<Place[]>([]);

  useEffect(() => { loadPlaces().then((p) => { setAll(p); setRows(p); }); }, []);
  useEffect(() => {
    if (!q.trim()) { setRows(all); return; }
    searchPlaces(q, 60).then(setRows);
  }, [q, all]);

  return (
    <>
      <Field value={q} onChange={setQ} placeholder="Babylon, Ephesus, Eden…" />
      <div className="space-y-5">
        {rows.map((p) => {
          const link = mapLink(p);
          return (
            <div key={p.name} className="border-b border-gold-dark/30 pb-5">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-gold-bright text-sm">{p.name}</h4>
                <span
                  title={certaintyMeaning(p.certainty)}
                  className={`text-[9px] tracking-widest uppercase whitespace-nowrap ${
                    p.certainty === 'unknown' || p.certainty === 'disputed'
                      ? 'text-gold-muted/40'
                      : 'text-gold-muted/70'
                  }`}
                >
                  {CERTAINTY_LABEL[p.certainty]}
                </span>
              </div>
              <p className="text-gold-metallic text-sm mt-1">
                {p.modern}
                {p.country && <span className="text-gold-muted/50"> · {p.country}</span>}
              </p>
              {p.note && (
                <p className="text-gold-muted/60 text-xs leading-relaxed mt-2">{p.note}</p>
              )}
              <div className="flex items-center gap-4 mt-2.5">
                <span className="text-gold-muted/40 text-[11px]">
                  {p.refs.map((r) => `${r.book} ${r.chapter}:${r.verse}`).join(' · ')}
                </span>
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-gold-muted/60 hover:text-gold-bright text-[11px] transition-colors"
                  >
                    Map <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── hymns ─────────────────────────────────────────────────────────────── */

function HymnsView({ language }: { language: LanguageCode }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Hymn[]>([]);
  const [open, setOpen] = useState<Hymn | null>(null);
  const [today, setToday] = useState<Hymn | null>(null);
  const [tune, setTune] = useState<Tune | null>(null);
  const [playing, setPlaying] = useState(false);
  const [voices, setVoices] = useState<PartName[]>([...PART_ORDER]);
  const { isSpeaking, speak, stop } = useVerseSpeech(language);

  // Load the melody when a hymn is opened, and stop any tune on the way out
  useEffect(() => {
    setTune(null);
    setPlaying(false);
    stopTune();
    if (open?.tune) getTune(open.tune).then(setTune);
    return () => stopTune();
  }, [open?.slug, open?.tune]);

  useEffect(() => { getHymns().then(setRows); getHymnOfDay().then(setToday); }, []);
  useEffect(() => {
    if (!q.trim()) { getHymns().then(setRows); return; }
    searchHymns(q, 60).then(setRows);
  }, [q]);

  if (open) {
    return (
      <>
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => { stop(); setOpen(null); }}
            className="flex items-center gap-1 text-gold-muted/60 hover:text-gold-bright text-xs transition-colors"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-4">
            {tune && (
              <button
                onClick={() => {
                  if (playing) { stopTune(); setPlaying(false); return; }
                  stop();
                  setPlaying(true);
                  void playTune(tune, { parts: voices, onEnd: () => setPlaying(false) });
                }}
                className="flex items-center gap-1.5 text-xs transition-colors
                           text-gold-muted/60 hover:text-gold-bright"
              >
                {playing ? <Square size={12} fill="currentColor" /> : <Play size={12} />}
                {playing ? 'Stop' : 'Play tune'}
              </button>
            )}
            <button
              onClick={() => { stopTune(); setPlaying(false); isSpeaking ? stop() : speak(hymnToSpeech(open)); }}
              className="text-gold-muted/60 hover:text-gold-bright text-xs transition-colors"
            >
              {isSpeaking ? 'Stop' : 'Read aloud'}
            </button>
          </div>
        </div>
        <h3 className="font-book-name text-gold-bright text-lg mb-1">{open.title}</h3>
        {tune?.tune && (
          <p className="text-gold-muted/40 text-[11px] mb-3">Tune: {tune.tune}</p>
        )}

        {tune && partsAvailable(tune).length > 1 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {partsAvailable(tune).map((part) => {
              const on = voices.includes(part);
              return (
                <button
                  key={part}
                  onClick={() => {
                    const next = on ? voices.filter((v) => v !== part) : [...voices, part];
                    if (!next.length) return;          // never silence everything
                    setVoices(next);
                    if (playing) {
                      stopTune();
                      void playTune(tune, { parts: next, onEnd: () => setPlaying(false) });
                    }
                  }}
                  className={`px-2.5 py-1 rounded border text-[10px] tracking-wider uppercase transition-colors ${
                    on
                      ? 'border-gold-bright text-gold-bright'
                      : 'border-gold-dark/40 text-gold-muted/40 hover:text-gold-muted'
                  }`}
                >
                  {part}
                </button>
              );
            })}
          </div>
        )}

        {(!tune?.tune && !tune) && <div className="mb-5" />}
        <div className="space-y-5">
          {open.verses.map((verse, i) => (
            <div key={i}>
              <p className="text-gold-muted/30 text-[10px] mb-1">{i + 1}</p>
              {verse.map((line, j) => (
                <p key={j} className="text-gold-metallic text-sm leading-relaxed">{line}</p>
              ))}
              {open.refrain && (
                <div className="mt-3 pl-4 border-l border-gold-dark">
                  {open.refrain.map((line, j) => (
                    <p key={j} className="text-gold-muted text-sm italic leading-relaxed">{line}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Field value={q} onChange={setQ} placeholder="A title or a first line…" />
      {!q && today && (
        <button
          onClick={() => setOpen(today)}
          className="block w-full text-left mb-6 px-4 py-3 border border-gold-dark rounded hover:border-gold-muted transition-colors"
        >
          <p className="text-gold-muted/40 text-[10px] tracking-widest uppercase mb-1">Hymn of the day</p>
          <p className="text-gold-bright text-sm">{today.title}</p>
        </button>
      )}
      <div className="space-y-1">
        {rows.map((h) => (
          <button
            key={h.slug}
            onClick={() => setOpen(h)}
            className="block w-full text-left px-3 py-2.5 border-b border-gold-dark/30 hover:text-gold-bright transition-colors"
          >
            <p className="text-gold-metallic text-sm flex items-center gap-2">
              {h.title}
              {h.tune && <Play size={9} className="text-gold-muted/40 shrink-0" />}
            </p>
            <p className="text-gold-muted/40 text-[11px] mt-0.5 line-clamp-1">{h.verses[0]?.[0]}</p>
          </button>
        ))}
      </div>
    </>
  );
}

/* ── devotional ────────────────────────────────────────────────────────── */

function DevotionalView() {
  const [d, setD] = useState<Devotional | null>(null);
  const [watch, setWatch] = useState<'morning' | 'evening'>(
    getWatchPeriod() === 'evening' ? 'evening' : 'morning',
  );
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    setBusy(true);
    getDevotional(watch).then((r) => { setD(r); setBusy(false); });
  }, [watch]);

  return (
    <>
      <div className="flex gap-6 mb-6 border-b border-gold-dark/40 pb-3">
        {(['morning', 'evening'] as const).map((w) => (
          <button
            key={w}
            onClick={() => setWatch(w)}
            className={`text-[10px] tracking-widest uppercase transition-colors ${
              watch === w ? 'text-gold-bright' : 'text-gold-muted/40 hover:text-gold-muted'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {busy && <Spinner />}

      {!busy && d && (
        <>
          <p className="text-gold-bright text-base italic leading-relaxed mb-2">"{d.verse}"</p>
          <p className="text-gold-muted/50 text-[11px] mb-6">{d.reference}</p>
          {d.body.split('\n\n').map((para, i) => (
            <p key={i} className="text-gold-metallic text-sm leading-[1.85] mb-4">{para}</p>
          ))}
          <p className="text-gold-muted/30 text-[10px] mt-6">C. H. Spurgeon, Morning and Evening, 1865</p>
        </>
      )}

      {!busy && !d && <Empty>No reading for today.</Empty>}
    </>
  );
}

/* ── other writings ────────────────────────────────────────────────────── */

function ExtraView({ onOpenPassage }: { onOpenPassage?: (b: string, c: number) => void }) {
  const [works, setWorks] = useState<Record<string, ExtraWork[]>>({});

  useEffect(() => {
    EXTRA_COLLECTIONS.forEach(async (c) => {
      const w = await loadCollection(c);
      setWorks((prev) => ({ ...prev, [c.id]: w }));
    });
  }, []);

  return (
    <div className="space-y-8">
      {EXTRA_COLLECTIONS.map((c) => (
        <div key={c.id}>
          <h4 className="font-book-name text-gold-bright text-sm mb-2">{c.title}</h4>
          <p className="text-gold-muted/50 text-xs leading-relaxed mb-4">{c.note}</p>
          <div className="space-y-1">
            {(works[c.id] ?? []).map((w) => (
              <button
                key={w.slug}
                onClick={() => onOpenPassage?.(w.name, 1)}
                className="block w-full text-left px-3 py-2 border-b border-gold-dark/30
                           text-gold-metallic text-sm hover:text-gold-bright transition-colors"
              >
                {w.name}
                <span className="text-gold-muted/40 text-[11px] ml-2">
                  {w.chapters} chapter{w.chapters === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


/* ── coming to christ ──────────────────────────────────────────────────── */

function GospelView({ language }: { language: LanguageCode }) {
  const [path, setPath] = useState<GospelPath | null>(null);
  const [t, setT] = useState<Awaited<ReturnType<typeof loadTranslation>>>(null);
  const [verses, setVerses] = useState<Record<string, ResolvedVerse[]>>({});
  const [decided, setDecided] = useState(getDecision());

  useEffect(() => {
    loadPath().then(async (p) => {
      setPath(p);
      if (!p) return;
      const tr = await loadTranslation(language);
      setT(tr);
      const out: Record<string, ResolvedVerse[]> = {};
      for (const st of p.stages) out[st.id] = await resolveStage(st, language);
      setVerses(out);
    });
  }, [language]);

  if (!path) return <Spinner />;

  const local = isTrustworthy(t) ? t : null;
  const title = local?.title ?? path.title;
  const intro = local?.intro ?? path.intro;

  return (
    <>
      <h3 className="font-book-name text-gold-bright text-lg mb-3">{title}</h3>
      <p className="text-gold-muted/70 text-sm leading-relaxed mb-8">{intro}</p>

      {t && !isTrustworthy(t) && (
        <p className="text-[11px] text-gold-muted/40 border-l border-gold-dark pl-3 mb-8 leading-relaxed">
          The explanations below are in English while the {t._name} wording is checked
          by a native speaker. The scripture itself is in your own language.
        </p>
      )}

      <div className="space-y-10">
        {path.stages.map((st) => {
          const ls = local?.stages?.[st.id];
          const prayer = st.prayer;
          const steps = st.steps;
          return (
            <div key={st.id}>
              <h4 className="text-gold-bright text-sm mb-2">{ls?.title ?? st.title}</h4>
              <p className="text-gold-metallic/85 text-sm leading-[1.8] mb-4">{ls?.body ?? st.body}</p>

              <div className="space-y-3 mb-4">
                {(verses[st.id] ?? []).map((v, i) => (
                  <div key={i}>
                    <p className="text-gold-metallic text-sm italic leading-relaxed">"{v.text}"</p>
                    <p className="text-gold-muted/50 text-[11px] mt-1">{v.reference}</p>
                  </div>
                ))}
              </div>

              {steps && (
                <ul className="space-y-2">
                  {(local?.steps ?? steps).map((line, i) => (
                    <li key={i} className="text-gold-metallic/85 text-sm leading-relaxed flex gap-2">
                      <span className="text-gold-muted/40">·</span>{line}
                    </li>
                  ))}
                </ul>
              )}

              {prayer && (
                <div className="mt-5 border-l-2 border-gold-dark pl-4">
                  <p className="text-gold-muted/60 text-xs mb-3">{local?.prayerIntro ?? prayer.intro}</p>
                  <p className="text-gold-bright text-sm leading-[1.9] italic">
                    {local?.prayer ?? prayer.text}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 pt-6 border-t border-gold-dark/40">
        {decided ? (
          <p className="text-gold-muted/60 text-xs">
            You marked this on {new Date(decided.at).toLocaleDateString()}. Kept on this
            device only.
          </p>
        ) : (
          <button
            onClick={() => setDecided(recordDecision())}
            className="text-xs text-gold-muted hover:text-gold-bright transition-colors
                       border border-gold-dark rounded px-4 py-2"
          >
            I prayed this today
          </button>
        )}
      </div>
    </>
  );
}

/* ── teachings ─────────────────────────────────────────────────────────── */

const THEMES: Theme[] = ['faith','fear','grace','hope','prayer','suffering',
  'joy','perseverance','humility','love','provision','rest'];

function TeachingsView() {
  const [theme, setTheme] = useState<Theme>('faith');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [own, setOwn] = useState(getOwnQuotes());
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [who, setWho] = useState('');

  useEffect(() => { loadTeachings(); }, []);
  useEffect(() => { getQuotes(theme, 12).then(setQuotes); }, [theme]);

  return (
    <>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 pb-4 border-b border-gold-dark/40">
        {THEMES.map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`text-[10px] tracking-widest uppercase transition-colors ${
              theme === t ? 'text-gold-bright' : 'text-gold-muted/40 hover:text-gold-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {quotes.map((q, i) => (
          <div key={i}>
            <p className="text-gold-metallic text-sm leading-[1.8] italic">"{q.text}"</p>
            <p className="text-gold-muted/50 text-[11px] mt-1.5">
              C. H. Spurgeon · {q.source}
              {q.scripture && ` · on ${q.scripture}`}
            </p>
          </div>
        ))}
        {!quotes.length && <Empty>Nothing under that theme yet.</Empty>}
      </div>

      <div className="mt-10 pt-6 border-t border-gold-dark/40">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-gold-bright text-sm">Your own</h4>
          <button
            onClick={() => setAdding(!adding)}
            className="text-xs text-gold-muted/60 hover:text-gold-bright transition-colors"
          >
            {adding ? 'Cancel' : 'Add one'}
          </button>
        </div>

        {adding && (
          <div className="space-y-3 mb-5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What was said…"
              rows={3}
              className="w-full bg-transparent border border-gold-dark rounded px-3 py-2 text-sm
                         text-gold-metallic placeholder:text-gold-muted/30 focus:outline-none
                         focus:border-gold-muted resize-none"
            />
            <input
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="Who said it"
              className="w-full bg-transparent border border-gold-dark rounded px-3 py-2 text-sm
                         text-gold-metallic placeholder:text-gold-muted/30 focus:outline-none
                         focus:border-gold-muted"
            />
            <button
              onClick={() => {
                if (!text.trim()) return;
                setOwn(saveOwnQuote(text, who || 'Unknown'));
                setText(''); setWho(''); setAdding(false);
              }}
              className="text-xs text-gold-muted hover:text-gold-bright border border-gold-dark
                         rounded px-4 py-2 transition-colors"
            >
              Save
            </button>
            <p className="text-gold-muted/40 text-[11px] leading-relaxed">
              Kept on this device only. Never sent anywhere.
            </p>
          </div>
        )}

        <div className="space-y-5">
          {own.map((q) => (
            <div key={q.id}>
              <p className="text-gold-metallic text-sm leading-relaxed italic">"{q.text}"</p>
              <p className="text-gold-muted/50 text-[11px] mt-1">— {q.speaker}</p>
            </div>
          ))}
          {!own.length && !adding && (
            <p className="text-gold-muted/40 text-xs italic">
              Heard something worth keeping? Save it here.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* ── backup ────────────────────────────────────────────────────────────── */

function BackupView() {
  const [msg, setMsg] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  return (
    <>
      <p className="text-gold-muted/70 text-sm leading-relaxed mb-8">
        Your notes, highlights, bookmarks and saved teachings live on this device only —
        nothing is sent anywhere and there is no account. That keeps it private, but it
        also means clearing your browser data would erase it. Keep a copy.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => { exportJson(); setMsg('Saved. Keep that file somewhere safe.'); }}
          className="flex items-center gap-3 w-full text-left px-4 py-3 border border-gold-dark
                     rounded hover:border-gold-muted transition-colors"
        >
          <Download size={15} className="text-gold-muted/60" />
          <span>
            <span className="block text-gold-metallic text-sm">Download a full backup</span>
            <span className="block text-gold-muted/40 text-[11px]">Restorable later</span>
          </span>
        </button>

        <button
          onClick={() => { exportMarkdown(); setMsg('Saved as readable text.'); }}
          className="flex items-center gap-3 w-full text-left px-4 py-3 border border-gold-dark
                     rounded hover:border-gold-muted transition-colors"
        >
          <FileText size={15} className="text-gold-muted/60" />
          <span>
            <span className="block text-gold-metallic text-sm">Download as readable text</span>
            <span className="block text-gold-muted/40 text-[11px]">To keep or print</span>
          </span>
        </button>

        <button
          onClick={() => file.current?.click()}
          className="flex items-center gap-3 w-full text-left px-4 py-3 border border-gold-dark
                     rounded hover:border-gold-muted transition-colors"
        >
          <Upload size={15} className="text-gold-muted/60" />
          <span>
            <span className="block text-gold-metallic text-sm">Restore from a backup</span>
            <span className="block text-gold-muted/40 text-[11px]">Merges, never wipes</span>
          </span>
        </button>

        <input
          ref={file}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = await restoreBackup(f);
            setMsg(r.ok ? `Restored ${r.restored.length} item groups. Reload to see them.` : r.error ?? 'Could not read that file.');
          }}
        />
      </div>

      {msg && <p className="text-gold-muted text-xs mt-5">{msg}</p>}
    </>
  );
}


/* ── progress ──────────────────────────────────────────────────────────── */

function ProgressView() {
  const summary = getSummary();
  const books = bookProgress();
  const days = recentDays(84);
  const log = getLog().slice(0, 30);

  const Stat = ({ n, label }: { n: string | number; label: string }) => (
    <div className="text-center">
      <p className="text-gold-bright text-2xl font-book-name">{n}</p>
      <p className="text-gold-muted/40 text-[10px] tracking-wider uppercase mt-1">{label}</p>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat n={summary.streak} label="Day streak" />
        <Stat n={summary.uniqueChapters} label="Chapters" />
        <Stat n={`${summary.percentOfBible}%`} label="Of the Bible" />
      </div>

      <div className="mb-8">
        <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-3">
          Last twelve weeks
        </p>
        <div className="grid grid-cols-[repeat(28,1fr)] gap-[3px]">
          {days.map((d) => (
            <span
              key={d.date}
              title={`${d.date} · ${d.count} chapter${d.count === 1 ? '' : 's'}`}
              className="aspect-square rounded-[1px]"
              style={{
                background: d.count === 0
                  ? 'hsl(var(--gold-dark))'
                  : `hsl(var(--gold-bright) / ${Math.min(1, 0.3 + d.count * 0.22)})`,
              }}
            />
          ))}
        </div>
        <p className="text-gold-muted/40 text-[11px] mt-3">
          {summary.daysRead} days read · {summary.thisWeek} chapters this week
        </p>
      </div>

      {summary.booksFinished.length > 0 && (
        <div className="mb-8">
          <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-2">
            Books finished
          </p>
          <p className="text-gold-metallic text-sm leading-relaxed">
            {summary.booksFinished.join(' · ')}
          </p>
        </div>
      )}

      {books.length > 0 && (
        <div className="mb-8">
          <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-3">
            By book
          </p>
          <div className="space-y-2.5">
            {books.slice(0, 20).map((b) => (
              <div key={b.book}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-gold-metallic">{b.book}</span>
                  <span className="text-gold-muted/40">{b.read} / {b.total}</span>
                </div>
                <div className="h-[3px] bg-gold-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold-bright/70"
                    style={{ width: `${Math.min(100, (b.read / b.total) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div>
          <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-3">
            Recently read
          </p>
          <div className="space-y-1.5">
            {log.map((e, i) => (
              <div key={i} className="flex justify-between text-[11px]">
                <span className="text-gold-metallic">
                  {e.book === 'Psalms' ? 'Psalm' : e.book} {e.chapter}
                </span>
                <span className="text-gold-muted/40">{e.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!log.length && <Empty>Nothing recorded yet. Open a chapter and it will appear here.</Empty>}
    </>
  );
}

/* ── prayers ───────────────────────────────────────────────────────────── */

function PrayersView() {
  const [list, setList] = useState<Prayer[]>(getPrayers);
  const [text, setText] = useState('');
  const [about, setAbout] = useState('');
  const [adding, setAdding] = useState(false);
  const [answering, setAnswering] = useState<string | null>(null);
  const [answerNote, setAnswerNote] = useState('');

  const open = list.filter((p) => !p.answeredAt);
  const answered = list.filter((p) => p.answeredAt);

  return (
    <>
      <button
        onClick={() => setAdding(!adding)}
        className="w-full text-left px-4 py-3 mb-6 border border-gold-dark rounded
                   text-gold-metallic text-sm hover:border-gold-muted transition-colors"
      >
        {adding ? 'Cancel' : 'Add a request'}
      </button>

      {adding && (
        <div className="space-y-3 mb-8">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What are you asking for?"
            rows={3}
            autoFocus
            className="w-full bg-transparent border border-gold-dark rounded px-3 py-2 text-sm
                       text-gold-metallic placeholder:text-gold-muted/30 focus:outline-none
                       focus:border-gold-muted resize-none"
          />
          <input
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Who or what it concerns (optional)"
            className="w-full bg-transparent border border-gold-dark rounded px-3 py-2 text-sm
                       text-gold-metallic placeholder:text-gold-muted/30 focus:outline-none
                       focus:border-gold-muted"
          />
          <button
            onClick={() => {
              if (!text.trim()) return;
              setList(addPrayer(text, about));
              setText(''); setAbout(''); setAdding(false);
            }}
            className="text-xs text-gold-muted hover:text-gold-bright border border-gold-dark
                       rounded px-4 py-2 transition-colors"
          >
            Save
          </button>
          <p className="text-gold-muted/40 text-[11px]">Kept on this device only.</p>
        </div>
      )}

      {open.length > 0 && (
        <div className="mb-10">
          <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-4">
            Carrying · {open.length}
          </p>
          <div className="space-y-5">
            {open.map((p) => (
              <div key={p.id} className="border-b border-gold-dark/30 pb-5">
                <p className="text-gold-metallic text-sm leading-relaxed">{p.text}</p>
                <p className="text-gold-muted/40 text-[11px] mt-1.5">
                  {p.about && <span>{p.about} · </span>}
                  {daysCarried(p) === 0 ? 'today' : `${daysCarried(p)} days`}
                </p>

                {answering === p.id ? (
                  <div className="mt-3 space-y-2">
                    <input
                      value={answerNote}
                      onChange={(e) => setAnswerNote(e.target.value)}
                      placeholder="What happened? (optional)"
                      autoFocus
                      className="w-full bg-transparent border border-gold-dark rounded px-3 py-2
                                 text-sm text-gold-metallic placeholder:text-gold-muted/30
                                 focus:outline-none focus:border-gold-muted"
                    />
                    <button
                      onClick={() => {
                        setList(markAnswered(p.id, answerNote));
                        setAnswering(null); setAnswerNote('');
                      }}
                      className="text-xs text-gold-bright"
                    >
                      Mark answered
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-4 mt-3">
                    <button
                      onClick={() => setAnswering(p.id)}
                      className="flex items-center gap-1 text-[11px] text-gold-muted/60 hover:text-gold-bright transition-colors"
                    >
                      <Check size={12} /> Answered
                    </button>
                    <button
                      onClick={() => setList(deletePrayer(p.id))}
                      className="flex items-center gap-1 text-[11px] text-gold-muted/40 hover:text-gold-bright transition-colors"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {answered.length > 0 && (
        <div>
          <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-4">
            Answered · {answered.length}
          </p>
          <div className="space-y-5">
            {answered.map((p) => (
              <div key={p.id} className="border-b border-gold-dark/20 pb-5 opacity-75">
                <p className="text-gold-metallic text-sm leading-relaxed">{p.text}</p>
                {p.answerNote && (
                  <p className="text-gold-bright text-sm italic mt-2 leading-relaxed">
                    {p.answerNote}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-gold-muted/40 text-[11px]">
                    carried {daysCarried(p)} days
                  </span>
                  <button
                    onClick={() => setList(reopenPrayer(p.id))}
                    className="flex items-center gap-1 text-[11px] text-gold-muted/40 hover:text-gold-bright transition-colors"
                  >
                    <RotateCcw size={11} /> Reopen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!list.length && !adding && (
        <Empty>Nothing here yet. What are you carrying today?</Empty>
      )}
    </>
  );
}

/* ── reading plans ─────────────────────────────────────────────────────── */

function PlansView({ onOpenPassage }: { onOpenPassage?: (b: string, c: number) => void }) {
  const [state, setState] = useState<PlanState | null>(getPlanState);
  const plan = state ? PLANS.find((p) => p.id === state.planId) : null;

  if (state && plan) {
    const readings = plan.readingsFor(state.day);
    const pct = Math.round((state.day / plan.days) * 100);
    return (
      <>
        <h4 className="text-gold-bright text-sm mb-1">{plan.name}</h4>
        <p className="text-gold-muted/50 text-[11px] mb-5">
          Day {state.day} of {plan.days} · {pct}%
        </p>

        <div className="h-[3px] bg-gold-dark rounded-full overflow-hidden mb-8">
          <div className="h-full bg-gold-bright/70" style={{ width: `${pct}%` }} />
        </div>

        <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-3">
          Today's reading
        </p>
        <div className="space-y-2 mb-8">
          {readings.map((r, i) => (
            <button
              key={i}
              onClick={() => onOpenPassage?.(r.book, r.fromChapter)}
              className="block w-full text-left px-4 py-3 border border-gold-dark rounded
                         text-gold-metallic text-sm hover:border-gold-muted hover:text-gold-bright
                         transition-colors"
            >
              {formatReading(r)}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setState(advancePlan())}
            className="text-xs text-gold-muted hover:text-gold-bright border border-gold-dark
                       rounded px-4 py-2 transition-colors"
          >
            Mark done, next day
          </button>
          <button
            onClick={() => { stopPlan(); setState(null); }}
            className="text-xs text-gold-muted/40 hover:text-gold-bright transition-colors"
          >
            Leave this plan
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="text-gold-muted/70 text-sm leading-relaxed mb-6">
        A plan gives you a set reading each day. You can leave or restart at any time,
        and nothing is lost if you miss a day.
      </p>
      <div className="space-y-2">
        {PLANS.map((p) => (
          <button
            key={p.id}
            onClick={() => setState(startPlan(p.id))}
            className="block w-full text-left px-4 py-3 border border-gold-dark rounded
                       hover:border-gold-muted transition-colors"
          >
            <span className="block text-gold-metallic text-sm">{p.name}</span>
            <span className="block text-gold-muted/40 text-[11px] mt-0.5">{p.note}</span>
          </button>
        ))}
      </div>
    </>
  );
}


/* ── topical bible ─────────────────────────────────────────────────────── */

function TopicalView({ language, onOpenPassage }: {
  language: LanguageCode; onOpenPassage?: (b: string, c: number) => void;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<TopicSummary[]>([]);
  const [open, setOpen] = useState<Topic | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [verses, setVerses] = useState<TopicVerse[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => { void searchTopics(q, 40).then(setHits); }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const openEntry = async (i: number) => {
    if (expanded === i) { setExpanded(null); setVerses([]); return; }
    setExpanded(i);
    setBusy(true);
    setVerses(await resolveEntry(open!.entries[i], language, 12));
    setBusy(false);
  };

  if (open) {
    return (
      <>
        <button
          onClick={() => { setOpen(null); setExpanded(null); setVerses([]); }}
          className="flex items-center gap-1 text-gold-muted/60 hover:text-gold-bright text-xs mb-5 transition-colors"
        >
          <ChevronLeft size={14} /> Back
        </button>

        <h3 className="font-book-name text-gold-bright text-lg mb-1">{open.name}</h3>
        <p className="text-gold-muted/40 text-[11px] mb-5">
          {open.entries.length} heading{open.entries.length === 1 ? '' : 's'}
          {open.seeAlso.length > 0 && ` · see also ${open.seeAlso.join(', ')}`}
        </p>

        <div className="space-y-1">
          {open.entries.map((e, i) => (
            <div key={i} className="border-b border-gold-dark/30">
              <button
                onClick={() => e.r.length && openEntry(i)}
                className={`w-full text-left py-2.5 text-sm transition-colors ${
                  e.r.length
                    ? expanded === i ? 'text-gold-bright' : 'text-gold-metallic hover:text-gold-bright'
                    : 'text-gold-muted/40'
                }`}
              >
                {e.h || 'General'}
                {e.r.length > 0 && (
                  <span className="text-gold-muted/40 text-[11px] ml-2">{e.r.length}</span>
                )}
              </button>

              {expanded === i && (
                <div className="pb-4 space-y-3">
                  {busy && <Spinner />}
                  {!busy && verses.map((v, j) => (
                    <button
                      key={j}
                      onClick={() => onOpenPassage?.(v.book, v.chapter)}
                      className="block w-full text-left group"
                    >
                      <p className="text-gold-muted/60 text-[11px] group-hover:text-gold-bright transition-colors">
                        {v.reference}
                      </p>
                      <p className="text-gold-metallic text-sm leading-relaxed">{v.text}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-gold-muted/30 text-[10px] mt-8">
          Nave's Topical Bible, 1897. Public domain.
        </p>
      </>
    );
  }

  return (
    <>
      <Field value={q} onChange={setQ} placeholder="A subject — faith, money, the cross…" />

      {!q && (
        <>
          <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-3">
            Often looked up
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {SUGGESTED.map((name) => (
              <button
                key={name}
                onClick={() => setQ(name)}
                className="px-3 py-1.5 rounded border border-gold-dark/40 text-gold-muted
                           hover:text-gold-bright hover:border-gold-muted text-xs transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
          <p className="text-gold-muted/40 text-xs leading-relaxed">
            5,320 subjects. Searching by topic finds passages that never use the
            word — "the second coming" turns up verses about His return however
            they are phrased.
          </p>
        </>
      )}

      <div className="space-y-1">
        {hits.map((t) => (
          <button
            key={t.s}
            onClick={async () => { setOpen(await getTopic(t.s)); setExpanded(null); }}
            className="block w-full text-left px-3 py-2.5 border-b border-gold-dark/30
                       hover:text-gold-bright transition-colors"
          >
            <span className="text-gold-metallic text-sm">{t.n}</span>
            <span className="text-gold-muted/40 text-[11px] ml-2">{t.r} references</span>
          </button>
        ))}
      </div>

      {q.trim().length >= 2 && !hits.length && <Empty>No topic under that name.</Empty>}
    </>
  );
}


/* ── alphabets ─────────────────────────────────────────────────────────── */

function AlphabetView() {
  const [tab, setTab] = useState<'hebrew' | 'greek'>('hebrew');

  return (
    <>
      <div className="flex gap-6 mb-6 border-b border-gold-dark/40 pb-3">
        {(['hebrew', 'greek'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[10px] tracking-widest uppercase transition-colors ${
              tab === t ? 'text-gold-bright' : 'text-gold-muted/40 hover:text-gold-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'hebrew' && (
        <>
          <p className="text-gold-muted/60 text-xs leading-relaxed mb-6">
            Twenty-two consonants, written right to left. The vowel points were
            added by the Masoretes between roughly the 7th and 10th centuries AD,
            preserving a pronunciation carried orally for centuries before that.
          </p>

          <div className="space-y-4">
            {HEBREW.map((l) => (
              <div key={l.name} className="border-b border-gold-dark/30 pb-4">
                <div className="flex items-baseline gap-4">
                  <span className="text-gold-bright text-3xl leading-none w-10">{l.letter}</span>
                  <span className="text-gold-metallic text-xl leading-none w-10">{l.paleo}</span>
                  <span className="min-w-0">
                    <span className="block text-gold-metallic text-sm">
                      {l.name}
                      <span className="text-gold-muted/50"> · {l.sound} · {l.value}</span>
                    </span>
                    <span className="block text-gold-muted/50 text-[11px] mt-0.5">
                      {l.meaning}{l.final && ` · final form ${l.final}`}
                    </span>
                  </span>
                </div>
                <p className="text-gold-muted/60 text-xs leading-relaxed mt-2">
                  {l.origin}
                  {l.disputed && (
                    <span className="text-gold-muted/40"> Scholars do not agree on this one.</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          <p className="text-gold-muted/40 text-[11px] leading-relaxed mt-6">
            The second column is Paleo-Hebrew, the script used through the First
            Temple period. After the exile Jews adopted the Aramaic square script,
            which is what Hebrew Bibles print today. Same language, different
            letterforms. If a box appears, your device has no font for the older
            script.
          </p>

          <p className="text-gold-muted/30 text-[10px] leading-relaxed mt-4">
            The letters began as pictures and became sound-signs long before the
            biblical books were written. Deriving a word's meaning by combining
            its letters' pictures is taught in some circles but is not accepted
            by Hebraists; these origins are history, not a key to meaning.
          </p>
        </>
      )}

      {tab === 'greek' && (
        <>
          <p className="text-gold-muted/60 text-xs leading-relaxed mb-6">
            Twenty-four letters, adapted from the Phoenician alphabet and the
            first to write vowels as letters in their own right. The New
            Testament was written in Koine, the common Greek of the eastern
            Mediterranean.
          </p>

          <div className="space-y-3">
            {GREEK.map((l) => (
              <div key={l.name} className="border-b border-gold-dark/30 pb-3">
                <div className="flex items-baseline gap-4">
                  <span className="text-gold-bright text-2xl leading-none w-14">
                    {l.upper}{l.lower}
                  </span>
                  <span>
                    <span className="text-gold-metallic text-sm">{l.name}</span>
                    <span className="text-gold-muted/50 text-sm"> · {l.sound} · {l.value}</span>
                  </span>
                </div>
                {l.note && (
                  <p className="text-gold-muted/60 text-xs leading-relaxed mt-1.5">{l.note}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ── the panel ─────────────────────────────────────────────────────────── */

export function LibraryPanel({ isOpen, onClose, language, onOpenPassage }: Props) {
  const [view, setView] = useState<View>('menu');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!isOpen) setView('menu'); }, [isOpen]);
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [view]);

  const shelf = SHELVES.find((s) => s.id === view);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="fixed inset-0 z-sheet bg-sacred-black flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gold-dark">
            {view === 'menu' ? (
              <h2 className="font-book-name text-sm text-gold-muted tracking-[0.2em] uppercase">
                Explore
              </h2>
            ) : (
              <button
                onClick={() => setView('menu')}
                className="flex items-center gap-1.5 font-book-name text-sm text-gold-muted
                           hover:text-gold-bright tracking-[0.15em] uppercase transition-colors"
              >
                <ChevronLeft size={15} />
                {shelf?.title}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gold-muted/60 hover:text-gold-bright transition-colors"
              aria-label="Close library"
            >
              <X size={20} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 pb-24">
            {view === 'menu' && (
              <div className="space-y-1">
                {SHELVES.map(({ id, icon: Icon, title, note }) => (
                  <button
                    key={id}
                    onClick={() => {
                      if (id === 'project') {
                        onClose();
                        window.dispatchEvent(new Event('open-projection'));
                        return;
                      }
                      setView(id);
                    }}
                    className="flex items-center gap-4 w-full text-left py-4
                               border-b border-gold-dark/30 group"
                  >
                    <Icon size={17} className="text-gold-muted/50 group-hover:text-gold-bright transition-colors shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-gold-metallic text-sm group-hover:text-gold-bright transition-colors">
                        {title}
                      </span>
                      <span className="block text-gold-muted/40 text-[11px] mt-0.5">{note}</span>
                    </span>
                  </button>
                ))}

                <button
                  onClick={() => window.dispatchEvent(new Event('open-notes'))}
                  className="flex items-center gap-4 w-full text-left py-4 border-b border-gold-dark/30 group"
                >
                  <FileText size={17} className="text-gold-muted/50 group-hover:text-gold-bright transition-colors shrink-0" />
                  <span>
                    <span className="block text-gold-metallic text-sm group-hover:text-gold-bright transition-colors">
                      My Notes and Bookmarks
                    </span>
                    <span className="block text-gold-muted/40 text-[11px] mt-0.5">Everything you have saved</span>
                  </span>
                </button>
              </div>
            )}

            {view === 'search'     && <SearchView language={language} onOpenPassage={onOpenPassage} />}
            {view === 'topical'    && <TopicalView language={language} onOpenPassage={onOpenPassage} />}
            {view === 'dictionary' && <DictionaryView />}
            {view === 'alphabet'   && <AlphabetView />}
            {view === 'places'     && <PlacesView />}
            {view === 'hymns'      && <HymnsView language={language} />}
            {view === 'devotional' && <DevotionalView />}
            {view === 'extra'      && <ExtraView onOpenPassage={onOpenPassage} />}
            {view === 'gospel'     && <GospelView language={language} />}
            {view === 'teachings'  && <TeachingsView />}
            {view === 'backup'     && <BackupView />}
            {view === 'progress'   && <ProgressView />}
            {view === 'prayers'    && <PrayersView />}
            {view === 'plans'      && <PlansView onOpenPassage={onOpenPassage} />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
