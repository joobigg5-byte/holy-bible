import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Maximize2, Search, Loader2 } from 'lucide-react';
import { BibleService } from '@/services/BibleService';
import { parseReference } from '@/services/bibleSearch';
import { formatRef, type SpokenRef } from '@/services/spokenReference';
import { useVerseListener, listeningSupported } from '@/hooks/useVerseListener';
import { LANGUAGES, languageNames, type LanguageCode } from '@/data/languages';

/**
 * Projection: a verse shown large enough to read from the back of a room.
 *
 * Two ways to drive it. Type a reference, or turn on listening and let the
 * preacher's own words bring it up.
 *
 * Type size scales with the length of the passage so a short verse fills the
 * screen and a long one still fits.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  language: LanguageCode;
}

interface Shown {
  reference: string;
  text: string;
  translation: string;
}

export function ProjectionView({ open, onClose, language }: Props) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState<LanguageCode>(language);
  const [notFound, setNotFound] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const show = useCallback(
    async (book: string, chapter: number, verse?: number, verseEnd?: number) => {
      setBusy(true);
      setNotFound(null);
      try {
        if (verse === undefined) {
          const ch = await BibleService.getChapter(book, chapter, lang);
          const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
          if (!nums.length) { setNotFound(`${book} ${chapter}`); return; }
          const text = nums.map((n) => ch[String(n)]?.text ?? '').join(' ').trim();
          setShown({
            reference: `${book === 'Psalms' ? 'Psalm' : book} ${chapter}`,
            text,
            translation: lang.toUpperCase(),
          });
        } else {
          const r = await BibleService.getVerse(book, chapter, verse, verseEnd, lang);
          if (r.source === 'missing' || !r.text) { setNotFound(`${book} ${chapter}:${verse}`); return; }
          setShown({ reference: r.reference, text: r.text, translation: lang.toUpperCase() });
        }
      } finally {
        setBusy(false);
      }
    },
    [lang],
  );

  const onSpoken = useCallback((ref: SpokenRef) => {
    void show(ref.book, ref.chapter, ref.verse, ref.verseEnd);
  }, [show]);

  const listener = useVerseListener({ onReference: onSpoken });

  useEffect(() => { if (!open) listener.stop(); }, [open]);   // eslint-disable-line
  useEffect(() => { setLang(language); }, [language]);

  const submit = () => {
    const ref = parseReference(query);
    if (!ref) { setNotFound(query); return; }
    void show(ref.book, ref.chapter, ref.verse);
    setQuery('');
  };

  const fullscreen = () => {
    const el = wrap.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  // Long passages get smaller type so everything stays on screen
  const size = (() => {
    const n = shown?.text.length ?? 0;
    if (n < 90) return 'text-[7vw] leading-[1.35]';
    if (n < 200) return 'text-[5.4vw] leading-[1.4]';
    if (n < 420) return 'text-[4vw] leading-[1.45]';
    if (n < 900) return 'text-[3vw] leading-[1.5]';
    return 'text-[2.2vw] leading-[1.55]';
  })();

  const micLabel: Record<string, string> = {
    off: 'Listen for verses',
    starting: 'Starting…',
    listening: 'Listening',
    denied: 'Microphone blocked',
    unsupported: 'Not supported in this browser',
    error: 'Try again',
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={wrap}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-takeover bg-sacred-black flex flex-col"
        >
          {/* Controls, kept small and out of the way */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gold-dark/40 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={listener.toggle}
                disabled={!listeningSupported()}
                title={micLabel[listener.state]}
                className={`flex items-center gap-1.5 text-[10px] tracking-widest uppercase
                            transition-colors disabled:opacity-40 ${
                  listener.state === 'listening'
                    ? 'text-gold-bright'
                    : 'text-gold-muted/60 hover:text-gold-bright'
                }`}
              >
                {listener.state === 'listening' ? <Mic size={14} /> : <MicOff size={14} />}
                <span className="hidden sm:inline">{micLabel[listener.state]}</span>
              </button>

              {listener.state === 'listening' && listener.heard && (
                <span className="text-gold-muted/30 text-[11px] truncate hidden md:inline">
                  {listener.heard}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as LanguageCode)}
                className="bg-transparent border border-gold-dark rounded px-2 py-1
                           text-[11px] text-gold-muted focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.nativeName}</option>
                ))}
              </select>
              <button onClick={fullscreen} className="text-gold-muted/60 hover:text-gold-bright" title="Full screen">
                <Maximize2 size={15} />
              </button>
              <button onClick={onClose} className="text-gold-muted/60 hover:text-gold-bright" title="Close">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* The verse */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-[6vw] py-6 overflow-y-auto text-center">
            {busy && <Loader2 size={22} className="animate-spin text-gold-muted/50" />}

            {!busy && shown && (
              <motion.div
                key={shown.reference}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <p className={`font-sacred text-gold-metallic ${size}`}>{shown.text}</p>
                <p className="mt-[3vh] text-gold-bright text-[2vw] tracking-[0.2em] uppercase">
                  {shown.reference}
                  <span className="text-gold-muted/50"> · {shown.translation}</span>
                </p>
              </motion.div>
            )}

            {!busy && !shown && !notFound && (
              <div className="text-center max-w-md">
                <p className="text-gold-muted/50 text-sm leading-relaxed">
                  Type a reference below, or turn on listening and it will follow
                  what the preacher says.
                </p>
                {!listeningSupported() && (
                  <p className="text-gold-muted/30 text-xs mt-4 leading-relaxed">
                    Listening needs Chrome or Edge, and a connection. Typing works
                    everywhere and offline.
                  </p>
                )}
              </div>
            )}

            {!busy && notFound && (
              <p className="text-gold-muted/50 text-sm">
                Could not find “{notFound}”.
              </p>
            )}
          </div>

          {/* Quick entry */}
          <div className="px-5 py-3 border-t border-gold-dark/40 shrink-0">
            <div className="flex gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-muted/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="John 3:16"
                  className="w-full bg-transparent border border-gold-dark rounded pl-9 pr-3 py-2
                             text-sm text-gold-metallic placeholder:text-gold-muted/30
                             focus:outline-none focus:border-gold-muted"
                />
              </div>
              <button
                onClick={submit}
                className="text-xs text-gold-muted hover:text-gold-bright border border-gold-dark
                           rounded px-4 transition-colors tracking-wider uppercase"
              >
                Show
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
