import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookmarkCheck, Headphones, Square, Sparkles } from 'lucide-react';
import type { Verse } from '@/data/lectionary';
import { LANGUAGES, type LanguageCode } from '@/data/languages';
import type { VerseSource } from '@/hooks/useBibleVerse';
import { HIGHLIGHT_COLORS, type HighlightColor } from '@/hooks/useAnnotations';
import { useVerseSpeech } from '@/hooks/useVerseSpeech';
import { useAIReflection } from '@/hooks/useAIReflection';
import { toast } from '@/hooks/use-toast';

interface ScribalVerseProps {
  verse: Verse;
  language: LanguageCode;
  isVeil: boolean;
  loading?: boolean;
  source?: VerseSource;
  onRevealComplete?: () => void;
  highlight?: HighlightColor | null;
  isBookmarked?: boolean;
  hasNote?: boolean;
  onLongPress?: () => void;
}

export function ScribalVerse({
  verse,
  language,
  isVeil,
  loading,
  source,
  onRevealComplete,
  highlight,
  isBookmarked,
  hasNote,
  onLongPress,
}: ScribalVerseProps) {
  // Prevent crash when verse or text is missing
  if (!verse?.text) {
    return (
      <div className="text-center px-8 py-12 text-gold-muted animate-pulse">
        Loading verse...
      </div>
    );
  }

  const text = verse.text;
  const isRTL = LANGUAGES.find(l => l.code === language)?.rtl ?? false;
  const words = useMemo(() => text.split(/\s+/), [text]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const wordDelay = isVeil ? 120 : 60;
  const { isSpeaking, toggle: toggleSpeech, stop: stopSpeech } = useVerseSpeech(language);
  const { generateReflection, isLoading: isAIReflecting } = useAIReflection();

  useEffect(() => {
    setRevealedCount(0);
    setSkipAnimation(false);
    stopSpeech();
  }, [text, stopSpeech]);

  useEffect(() => {
    if (skipAnimation) {
      setRevealedCount(words.length);
      return;
    }
    if (revealedCount >= words.length) {
      onRevealComplete?.();
      return;
    }
    const timer = setTimeout(() => {
      setRevealedCount(c => c + 1);
    }, wordDelay);
    return () => clearTimeout(timer);
  }, [revealedCount, words.length, wordDelay, skipAnimation, onRevealComplete]);

  const isComplete = revealedCount >= words.length;

  // Long-press detection (touch + mouse)
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  const triggeredRef = useRef(false);
  const startPress = () => {
    if (!onLongPress) return;
    triggeredRef.current = false;
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      triggeredRef.current = true;
      onLongPress();
    }, 500);
  };
  const cancelPress = () => clearTimeout(pressTimer.current);

  return (
    <div
      className="text-center px-8 cursor-pointer select-none relative"
      onClick={() => {
        if (triggeredRef.current) return;
        if (!isComplete) setSkipAnimation(true);
      }}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onContextMenu={e => {
        if (onLongPress) {
          e.preventDefault();
          triggeredRef.current = true;
          onLongPress();
        }
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Highlight backdrop */}
      {highlight && (
        <div
          aria-hidden
          className="absolute inset-x-4 inset-y-2 rounded-2xl pointer-events-none"
          style={{ backgroundColor: HIGHLIGHT_COLORS[highlight], opacity: 0.08 }}
        />
      )}

      {/* Bookmark indicator */}
      {isBookmarked && (
        <div className="absolute top-0 right-6 text-gold-muted/60">
          <BookmarkCheck size={14} />
        </div>
      )}

      {/* Book name */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="font-book-name text-sm tracking-[0.25em] text-gold-muted mb-6 relative"
      >
        {verse.book}
      </motion.p>

      {/* Chapter & Verse */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="font-verse-number text-xs text-gold-muted mb-8 tracking-[0.2em] relative"
      >
        Chapter {verse.chapter}, Verse{verse.verseEnd ? `s ${verse.verseStart}–${verse.verseEnd}` : ` ${verse.verseStart}`}
        {hasNote && <span className="ml-2 text-gold-bright/70" title="Has note">✎</span>}
        {loading && <span className="ml-2 opacity-60 animate-pulse">·</span>}
      </motion.p>

      {/* Verse text with word-by-word reveal */}
      <p className={`text-lg sm:text-xl leading-[1.8] max-w-lg mx-auto ${isComplete ? 'gold-pulse' : ''} ${isVeil ? 'text-gold-veil' : 'text-gold-metallic'} ${loading ? 'opacity-70' : ''}`}>
        <span className="italic">"</span>
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="inline-block transition-opacity duration-300"
            style={{
              opacity: i < revealedCount ? 1 : 0,
              marginRight: '0.3em',
            }}
          >
            {word}
          </span>
        ))}
        {isComplete && <span className="italic">"</span>}
      </p>

      {/* Citation */}
      <AnimatePresence>
        {isComplete && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-8 text-sm text-gold-muted tracking-wider flex items-center justify-center gap-2"
          >
            <span>— {verse.reference} ({verse.translation})</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggeredRef.current = true;
                toggleSpeech(text);
              }}
              aria-label={isSpeaking ? 'Stop audio' : 'Listen to verse'}
              title={isSpeaking ? 'Stop audio' : 'Listen to verse'}
              className={`text-gold-muted/60 hover:text-gold-bright transition-colors ${isSpeaking ? 'text-gold-bright' : ''}`}
            >
              {isSpeaking ? <Square size={12} fill="currentColor" /> : <Headphones size={12} />}
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                triggeredRef.current = true;
                const reflection = await generateReflection(text, verse.reference);
                // Save to notes in localStorage
                const note = {
                  verseKey: `${verse.book}_${verse.chapter}_${verse.verseStart}`,
                  text: reflection,
                  timestamp: new Date().toISOString(),
                };
                const notes = JSON.parse(localStorage.getItem('bible_notes') || '[]');
                notes.push(note);
                localStorage.setItem('bible_notes', JSON.stringify(notes));
                toast({ description: 'Reflection saved to My Library.' });
              }}
              disabled={isAIReflecting}
              aria-label="Generate AI reflection"
              title="Generate AI reflection"
              className="text-gold-muted/60 hover:text-gold-bright transition-colors"
            >
              {isAIReflecting ? <span className="text-xs">...</span> : <Sparkles size={12} />}
            </button>
            {(source === 'cache' || source === 'offline') && (
              <span
                aria-label={source === 'cache' ? 'Loaded from cache' : 'Loaded offline'}
                title={source === 'cache' ? 'Loaded from cache' : 'Loaded offline'}
                className="text-[10px] tracking-wider text-gold-muted/60"
              >
                📦 Offline
              </span>
            )}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}