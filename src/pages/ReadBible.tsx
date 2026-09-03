import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, WifiOff, Wifi,
  Anchor as AnchorIcon, Eye, X, Headphones, StopCircle, Moon, Columns2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BIBLE_BOOKS, findBook } from '@/data/bibleBooks';
import { bookLabel, bookNative } from '@/data/bookNames';
import { useBibleChapter } from '@/hooks/useBibleChapter';
import { useRecentChapters } from '@/hooks/useRecentChapters';
import { LanguageSelector } from '@/components/LanguageSelector';
import { DEFAULT_LANGUAGE, type LanguageCode, languageNames } from '@/data/languages';
import { detectLanguage } from '@/services/detectLanguage';
import { preloadPopularBooks } from '@/services/bibleReader';
import { useVerseSpeech } from '@/hooks/useVerseSpeech';
import { VerseStudy } from '@/components/VerseStudy';
import { loadParallelChapter, getParallelPref, setParallelPref, versificationNote, type ParallelChapter } from '@/services/parallelReading';
import { useSleepTimer, TIMER_OPTIONS, type TimerMinutes } from '@/hooks/useSleepTimer';
import { useMediaSession } from '@/hooks/useMediaSession';
import { logChapter } from '@/services/progress';

const POSITION_KEY = 'bibleReader:position';
const LANG_KEY = 'preferredLanguage';

interface Position { book: string; chapter: number; }
interface Verse { n: number; t: string; }

const DEFAULT_POS: Position = { book: 'John', chapter: 1 };

const ReadBible = () => {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
    // First visit: start in the reader's own language rather than English.
    // Once they choose anything, that choice wins for good.
    return (localStorage.getItem(LANG_KEY) as LanguageCode | null) ?? detectLanguage();
  });
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === 'undefined') return DEFAULT_POS;
    try {
      const raw = localStorage.getItem(POSITION_KEY);
      if (raw) return JSON.parse(raw) as Position;
    } catch { /* noop */ }
    return DEFAULT_POS;
  });
  const [browserOpen, setBrowserOpen] = useState(false);
  const [testament, setTestament] = useState<'OT' | 'NT'>('NT');
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [anchorOpen, setAnchorOpen] = useState(false);
  const [silence, setSilence] = useState(false);
  const [study, setStudy] = useState<number | null>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [parallel, setParallel] = useState<ParallelChapter | null>(null);
  const [pref, setPref] = useState(() => getParallelPref(language));
  const dragged = useRef(false);

  const book = findBook(position.book) ?? findBook('John')!;
  const { data, loading, source, fellBack } = useBibleChapter(language, book.name, position.chapter);
  const { push: pushRecent } = useRecentChapters();
  const { isSpeaking, currentVerseIndex, speak, stop } = useVerseSpeech(language);

  useEffect(() => { localStorage.setItem(POSITION_KEY, JSON.stringify(position)); }, [position]);
  useEffect(() => { localStorage.setItem(LANG_KEY, language); }, [language]);

  useEffect(() => {
    if (!loading && Object.keys(data).length) pushRecent(book.name, position.chapter);
  }, [loading, data, book.name, position.chapter, pushRecent]);

  useEffect(() => {
    let cancelled = false;
    setProgress({ loaded: 0, total: 6 });
    preloadPopularBooks(language, (loaded, total) => {
      if (!cancelled) setProgress({ loaded, total });
    }).finally(() => {
      if (!cancelled) setTimeout(() => setProgress(null), 800);
    });
    return () => { cancelled = true; };
  }, [language]);

  const verses = useMemo(
    () => Object.entries(data).map(([n, t]) => ({ n: Number(n), t })).sort((a, b) => a.n - b.n),
    [data],
  );

  // Settings lives on another screen; keep in step with it
  useEffect(() => {
    const sync = () => setPref(getParallelPref(language));
    window.addEventListener('parallel-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('parallel-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, [language]);

  // If the chosen second language is the one already being read, the two
  // columns would be identical and nothing appeared to happen. Fall back to a
  // sensible different translation rather than silently doing nothing.
  const secondary = pref.secondary !== language
    ? pref.secondary
    : (language === 'kjv' ? 'twi' : 'kjv');

  // Second column, loaded only when the reader has asked for one
  useEffect(() => {
    if (!pref.enabled) { setParallel(null); return; }
    let cancelled = false;
    loadParallelChapter(book.name, position.chapter, language, secondary)
      .then((p) => { if (!cancelled) setParallel(p); })
      .catch(() => { if (!cancelled) setParallel(null); });
    return () => { cancelled = true; };
  }, [pref.enabled, secondary, language, book.name, position.chapter]);

  // Record what was read, for Progress
  useEffect(() => {
    if (!verses.length) return;
    logChapter(book.name, position.chapter, language);
  }, [book.name, position.chapter, language, verses.length]);

  // Lock-screen controls and a wake lock, so audio survives the screen going off
  useMediaSession({
    isPlaying: isSpeaking,
    title: `${book.name === 'Psalms' ? 'Psalm' : book.name} ${position.chapter}`,
    album: languageNames[language],
    onPlay: () => speak(verses),
    onPause: () => stop(),
    onNext: () => goNext(),
    onPrevious: () => goPrev(),
  });

  const sleep = useSleepTimer({
    onExpire: () => stop(),
  });

  const handleToggleAudio = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(verses);
    }
  };

  const goPrev = () => {
    stop();
    if (position.chapter > 1) return setPosition({ book: book.name, chapter: position.chapter - 1 });
    const idx = BIBLE_BOOKS.findIndex(b => b.name === book.name);
    if (idx > 0) {
      const prev = BIBLE_BOOKS[idx - 1];
      setPosition({ book: prev.name, chapter: prev.chapters });
    }
  };

  const goNext = () => {
    stop();
    if (position.chapter < book.chapters) return setPosition({ book: book.name, chapter: position.chapter + 1 });
    const idx = BIBLE_BOOKS.findIndex(b => b.name === book.name);
    if (idx < BIBLE_BOOKS.length - 1) {
      setPosition({ book: BIBLE_BOOKS[idx + 1].name, chapter: 1 });
    }
  };

  // Every translation is bundled, so a chapter is always served locally —
  // either from the in-memory cache or straight from disk. The old 'live'
  // branch could never run.
  const sourceBadge = source === 'cache' || source === 'offline'
    ? { icon: WifiOff, label: 'Offline' }
    : null;
  const SourceIcon = sourceBadge?.icon;
  const nativeBook = bookNative(book.name, language);
  const displayBook = book.name === 'Psalms' && language === 'kjv' ? 'Psalm' : nativeBook;
  const languageName = languageNames[language] || language;

  const chapterCols = book.chapters <= 12 ? 6 : book.chapters <= 50 ? 8 : 10;

  if (silence) {
    return (
      <div
        className="fixed inset-0 z-takeover bg-sacred-black overflow-y-auto cursor-pointer"
        onClick={() => setSilence(false)}
      >
        <div className="max-w-2xl mx-auto px-6 py-16">
          <article className="space-y-4 leading-[1.8] text-lg font-serif">
            {verses.map(v => (
              <p key={v.n} className="text-gold-metallic">
                <sup className="text-[#B8960C] text-xs mr-1.5 font-sans">{v.n}</sup>
                {v.t}
              </p>
            ))}
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sacred-black text-gold-bright font-serif">
      <header className="sticky top-0 z-20 bg-sacred-black/95 backdrop-blur border-b border-gold-dark/40">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 text-gold-muted/70 hover:text-gold-bright transition-colors">
            <ArrowLeft size={16} />
            <span className="text-[11px] tracking-[0.25em] uppercase">Sanctuary</span>
          </Link>

          <button
            onClick={() => setBrowserOpen(true)}
            className="text-gold-bright text-base tracking-wide hover:text-gold-muted transition-colors"
          >
            <span className="whitespace-nowrap">{displayBook} {position.chapter}</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleAudio}
              disabled={!verses.length}
              className="text-gold-muted/60 hover:text-gold-bright transition-colors disabled:opacity-30"
              title={isSpeaking ? 'Stop reading' : 'Read chapter aloud'}
            >
              {isSpeaking ? (
                <StopCircle size={16} className="animate-pulse" />
              ) : (
                <Headphones size={16} />
              )}
            </button>
            <button
              onClick={() => {
                const next = !pref.enabled;
                setPref(setParallelPref({ enabled: next }));
              }}
              className={`transition-colors ${pref.enabled ? 'text-gold-bright' : 'text-gold-muted/60 hover:text-gold-bright'}`}
              title="Two languages side by side"
            >
              <Columns2 size={16} />
            </button>
            <button
              onClick={() => setTimerOpen(!timerOpen)}
              className={`transition-colors ${sleep.isRunning ? 'text-gold-bright' : 'text-gold-muted/60 hover:text-gold-bright'}`}
              title="Sleep timer"
            >
              <Moon size={16} />
            </button>
            <button
              onClick={() => setAnchorOpen(true)}
              disabled={!verses.length}
              className="text-gold-muted/60 hover:text-gold-bright transition-colors disabled:opacity-30"
              title="Source text"
            >
              <AnchorIcon size={16} />
            </button>
            <button
              onClick={() => setSilence(true)}
              className="text-gold-muted/60 hover:text-gold-bright transition-colors"
              title="Silence Mode"
            >
              <Eye size={16} />
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {sourceBadge && SourceIcon ? (
              <span className="flex items-center gap-1 text-[10px] tracking-[0.25em] uppercase text-gold-muted/60">
                <SourceIcon size={11} />
                {sourceBadge.label}
              </span>
            ) : <span />}
            {fellBack && (
              <span className="text-[10px] tracking-[0.25em] uppercase text-amber-400/60">
                ⚠️ {languageName} unavailable
              </span>
            )}
          </div>
          <AnimatePresence>
            {progress && progress.loaded < progress.total && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] tracking-[0.25em] uppercase text-gold-muted/50"
              >
                Loading… ({progress.loaded}/{progress.total})
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-center text-[10px] tracking-[0.3em] uppercase text-gold-muted/50 mb-6">
          Chapter {position.chapter} of {book.chapters}
        </p>

        {parallel && versificationNote(parallel) && (
          <p className="text-[11px] leading-relaxed text-gold-muted/45 border-l border-gold-dark pl-3 mb-6">
            {versificationNote(parallel)}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-2 h-2 rounded-full bg-gold-muted animate-pulse" />
          </div>
        ) : verses.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gold-muted/60 mb-2">
              {navigator.onLine
                ? 'This chapter could not be loaded.'
                : 'This chapter is not saved on your device yet.'}
            </p>
            <p className="text-gold-muted/40 text-xs mb-4">
              {navigator.onLine
                ? 'Try another chapter, or a different language, and let us know if it keeps happening.'
                : 'Connect once and it will be kept for offline reading.'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={`${book.name}-${position.chapter}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragStart={() => { dragged.current = true; }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80 || info.velocity.x < -500) goNext();
                else if (info.offset.x > 80 || info.velocity.x > 500) goPrev();
                setTimeout(() => { dragged.current = false; }, 60);
              }}
              className="space-y-4 leading-[1.8] text-lg cursor-grab active:cursor-grabbing touch-pan-y"
            >
              {parallel ? (
                parallel.rows.map(row => (
                  <div key={row.verse} className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-x-5 gap-y-1">
                    <p
                      onClick={() => { if (!dragged.current) setStudy(row.verse); }}
                      className={`text-[0.94rem] leading-[1.75] cursor-pointer transition-colors ${
                        currentVerseIndex === row.verse ? 'text-gold-bright' : 'text-gold-metallic'
                      }`}
                    >
                      <sup className="text-[#B8960C] text-xs mr-1.5 font-sans">{row.verse}</sup>
                      {row.primary ?? <span className="text-gold-muted/25">—</span>}
                    </p>
                    <p className="text-[0.94rem] leading-[1.75] text-gold-muted/75
                                  pl-4 border-l border-gold-dark/40
                                  min-[380px]:pl-0 min-[380px]:border-l-0">
                      {row.secondary ?? <span className="text-gold-muted/25">—</span>}
                    </p>
                  </div>
                ))
              ) : (
                verses.map(v => (
                  <p
                    key={v.n}
                    onClick={() => { if (!dragged.current) setStudy(v.n); }}
                    className={`cursor-pointer transition-colors ${
                      currentVerseIndex === v.n ? 'text-gold-bright' : 'text-gold-metallic'
                    }`}
                  >
                    <sup className="text-[#B8960C] text-xs mr-1.5 font-sans">{v.n}</sup>
                    {v.t}
                  </p>
                ))
              )}
            </motion.article>
          </AnimatePresence>
        )}

        <AnimatePresence>
          {timerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="fixed top-20 right-5 z-sheet bg-card border border-gold-dark rounded-lg px-4 py-3 shadow-xl"
            >
              <p className="text-[10px] tracking-[0.2em] uppercase text-gold-muted/60 mb-3">
                {sleep.isRunning ? `Stops in ${sleep.label}` : 'Read until'}
              </p>
              {sleep.isRunning ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => sleep.extend(15)}
                    className="text-xs text-gold-muted hover:text-gold-bright transition-colors"
                  >
                    +15 min
                  </button>
                  <button
                    onClick={() => { sleep.cancel(); setTimerOpen(false); }}
                    className="text-xs text-gold-muted/60 hover:text-gold-bright transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  {TIMER_OPTIONS.map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        sleep.start(m as TimerMinutes);
                        if (!isSpeaking) speak(verses);
                        setTimerOpen(false);
                      }}
                      className="text-xs text-gold-muted hover:text-gold-bright transition-colors"
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-12 pt-6 border-t border-gold-dark/30">
          <button onClick={goPrev} className="flex items-center gap-2 text-gold-muted/60 hover:text-gold-bright transition-colors text-xs tracking-[0.2em] uppercase">
            <ChevronLeft size={16} /> Prev
          </button>
          <button onClick={() => setBrowserOpen(true)} className="text-xs tracking-[0.2em] uppercase text-gold-bright hover:text-gold-muted transition-colors">
            <span className="whitespace-nowrap">{displayBook} {position.chapter}</span> ▼
          </button>
          <button onClick={goNext} className="flex items-center gap-2 text-gold-muted/60 hover:text-gold-bright transition-colors text-xs tracking-[0.2em] uppercase">
            Next <ChevronRight size={16} />
          </button>
        </div>

        <div className="mt-6 flex justify-center">
          <LanguageSelector value={language} onChange={setLanguage} />
        </div>
      </main>

      <AnimatePresence>
        {anchorOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-takeover bg-sacred-black overflow-y-auto"
          >
            <button onClick={() => setAnchorOpen(false)} className="absolute top-5 right-5 text-gold-muted/60 hover:text-gold-bright">
              <X size={18} />
            </button>
            <div className="max-w-2xl mx-auto px-8 py-16">
              <p className="text-[10px] tracking-[0.3em] uppercase text-gold-muted/50 text-center mb-8">
                Source Text — <span className="whitespace-nowrap">{displayBook} {position.chapter}</span>
              </p>
              <p className="text-lg leading-[1.9] text-gold-metallic">
                {verses.map(v => `${v.n} ${v.t}`).join(' ')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {browserOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setBrowserOpen(false)}
              className="fixed inset-0 z-overlay bg-sacred-black/80"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-0 bottom-0 z-sheet bg-sacred-black border-t border-gold-dark rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="mx-auto mt-3 mb-2 h-1 w-12 rounded-full bg-gold-dark" />
              <div className="flex justify-center gap-6 pb-3 border-b border-gold-dark/40">
                {(['OT', 'NT'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTestament(t)}
                    className={`text-[11px] tracking-[0.3em] uppercase pb-2 border-b transition-colors ${
                      testament === t
                        ? 'text-gold-bright border-gold-bright'
                        : 'text-gold-muted/50 border-transparent hover:text-gold-muted'
                    }`}
                  >
                    {t === 'OT' ? 'Old Testament' : 'New Testament'}
                  </button>
                ))}
              </div>
              <div className="overflow-y-auto p-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {BIBLE_BOOKS.filter(b => b.testament === testament).map(b => (
                    <button
                      key={b.name}
                      onClick={() => { setPosition({ book: b.name, chapter: 1 }); setBrowserOpen(false); }}
                      className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                        b.name === book.name
                          ? 'bg-gold-dark/30 text-gold-bright'
                          : 'text-gold-muted/80 hover:bg-gold-dark/15 hover:text-gold-bright'
                      }`}
                    >
                      {bookLabel(b.name, language)}
                    </button>
                  ))}
                </div>
                <div className="mt-8">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-gold-muted/50 mb-3 text-center">
                    {bookNative(book.name, language)} — Chapter {position.chapter} of {book.chapters}
                  </p>
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${chapterCols}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: book.chapters }, (_, i) => i + 1).map(c => (
                      <button
                        key={c}
                        onClick={() => { setPosition({ book: book.name, chapter: c }); setBrowserOpen(false); }}
                        className={`aspect-square rounded text-xs font-sans transition-colors ${
                          c === position.chapter
                            ? 'text-sacred-black bg-gold-bright'
                            : 'text-gold-metallic hover:text-gold-bright hover:bg-gold-dark/20'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <VerseStudy
        open={study !== null}
        onClose={() => setStudy(null)}
        book={book.name}
        chapter={position.chapter}
        verse={study ?? 1}
        verseLabel={`${displayBook} ${position.chapter}:${study ?? 1}`}
        language={language}
        onOpenPassage={(b, c) => setPosition({ book: b, chapter: c })}
      />
    </div>
  );
};

export default ReadBible;