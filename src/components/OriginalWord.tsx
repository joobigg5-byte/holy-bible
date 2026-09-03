import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import {
  getTokens, lookup, findOccurrences, renderings,
  type Token, type LexEntry, type Occurrence,
} from '@/services/strongs';

/**
 * The original-language panel: the interlinear for a verse, and the lexicon
 * entry for whichever word is tapped.
 *
 * Strong's tagging exists for the KJV only, so this is offered when the reader
 * is in English. In another translation the words do not line up.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  book: string;
  chapter: number;
  verse: number;
  verseLabel: string;
  onOpenPassage?: (book: string, chapter: number) => void;
}

export function OriginalWord({
  open, onClose, book, chapter, verse, verseLabel, onOpenPassage,
}: Props) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [entry, setEntry] = useState<LexEntry | null>(null);
  const [uses, setUses] = useState<Occurrence[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingUses, setLoadingUses] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEntry(null);
    setUses(null);
    setBusy(true);
    getTokens(book, chapter, verse).then((t) => { setTokens(t); setBusy(false); });
  }, [open, book, chapter, verse]);

  const choose = async (num: string) => {
    setUses(null);
    setEntry(await lookup(num));
    setLoadingUses(true);
    const found = await findOccurrences(num, 60);
    setUses(found);
    setLoadingUses(false);
  };

  const isHebrew = entry?.language === 'Hebrew';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-sacred-black/70 z-overlay"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-sheet bg-card border-t border-gold-dark
                       rounded-t-2xl px-6 pt-4 pb-8 max-h-[82vh] flex flex-col"
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-gold-muted/30 mb-5 shrink-0" />

            <div className="flex items-center justify-between mb-4 shrink-0">
              <span className="text-[10px] tracking-[0.25em] uppercase text-gold-muted/70">
                {entry ? `${entry.language} · ${entry.number}` : verseLabel}
              </span>
              <button onClick={onClose} className="text-gold-muted/50 hover:text-gold-muted">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 -mx-1 px-1">
              {busy && (
                <div className="flex justify-center py-10">
                  <Loader2 size={16} className="animate-spin text-gold-muted/50" />
                </div>
              )}

              {!busy && !tokens.length && (
                <p className="text-center text-gold-muted/40 text-xs italic py-10">
                  No original-language tagging for this verse.
                </p>
              )}

              {/* The verse, with tagged words tappable */}
              {!busy && tokens.length > 0 && (
                <p className="text-gold-metallic text-[0.95rem] leading-[2] mb-6">
                  {tokens.map((t, i) =>
                    t.s?.length ? (
                      <button
                        key={i}
                        onClick={() => choose(t.s![0])}
                        className={`transition-colors border-b border-dotted ${
                          entry && t.s.includes(entry.number)
                            ? 'text-gold-bright border-gold-bright'
                            : 'text-gold-metallic border-gold-dark hover:text-gold-bright'
                        }`}
                      >
                        {t.w}
                      </button>
                    ) : (
                      <span key={i}>{t.w}</span>
                    ),
                  )}
                </p>
              )}

              {!busy && tokens.length > 0 && !entry && (
                <p className="text-gold-muted/40 text-[11px] italic">
                  Tap any underlined word for the Hebrew or Greek behind it.
                </p>
              )}

              {/* The lexicon entry */}
              {entry && (
                <div className="border-t border-gold-dark/40 pt-5">
                  <p
                    dir={isHebrew ? 'rtl' : 'ltr'}
                    className="text-gold-bright text-3xl leading-tight mb-2"
                  >
                    {entry.lemma}
                  </p>
                  <p className="text-gold-metallic text-sm">
                    {entry.xlit}
                    {entry.pronounce && (
                      <span className="text-gold-muted/50"> · {entry.pronounce}</span>
                    )}
                  </p>
                  <p className="text-gold-muted/40 text-[11px] mt-1 mb-4">
                    {entry.number} · {entry.language} · appears {entry.occurrences} times
                  </p>

                  <p className="text-gold-metallic text-sm leading-relaxed mb-5">
                    {entry.definition}
                  </p>

                  {uses && uses.length > 0 && (
                    <>
                      <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-2">
                        Translated as
                      </p>
                      <p className="text-gold-metallic text-sm mb-5">
                        {renderings(uses)
                          .slice(0, 12)
                          .map((r) => `${r.word} (${r.count})`)
                          .join(' · ')}
                      </p>

                      <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-2">
                        Where it appears
                      </p>
                      <div className="space-y-1">
                        {uses.slice(0, 40).map((o, i) => (
                          <button
                            key={i}
                            onClick={() => { onClose(); onOpenPassage?.(o.book, o.chapter); }}
                            className="block w-full text-left text-[12px] text-gold-muted/70
                                       hover:text-gold-bright transition-colors"
                          >
                            {o.reference}
                            <span className="text-gold-muted/40"> — {o.word}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {loadingUses && (
                    <div className="flex items-center gap-2 text-gold-muted/50 text-xs mt-3">
                      <Loader2 size={12} className="animate-spin" />
                      Searching the concordance…
                    </div>
                  )}
                </div>
              )}

              <p className="text-gold-muted/30 text-[10px] mt-8">
                Strong's Concordance, 1890. Public domain.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
