import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Link2, ScrollText } from 'lucide-react';
import { getCrossRefs, type CrossRef } from '@/services/crossRefs';
import { getCommentary, isHeading, headingText } from '@/services/commentary';
import type { LanguageCode } from '@/data/languages';

/**
 * Study sheet for a single verse — cross-references and Matthew Henry.
 * Follows the same bottom-sheet pattern as VerseSheet so it feels native.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  book: string;
  chapter: number;
  verse: number;
  verseLabel: string;
  language: LanguageCode;
  onOpenPassage: (book: string, chapter: number) => void;
}

type Tab = 'refs' | 'notes';

export function VerseStudy({
  open, onClose, book, chapter, verse, verseLabel, language, onOpenPassage,
}: Props) {
  const [tab, setTab] = useState<Tab>('refs');
  const [refs, setRefs] = useState<CrossRef[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab('refs');
    setBusy(true);
    getCrossRefs(book, chapter, verse, language, 8)
      .then(setRefs)
      .finally(() => setBusy(false));
  }, [open, book, chapter, verse, language]);

  useEffect(() => {
    if (!open || tab !== 'notes' || notes.length) return;
    setBusy(true);
    getCommentary(book, chapter)
      .then(setNotes)
      .finally(() => setBusy(false));
  }, [open, tab, book, chapter, notes.length]);

  useEffect(() => { setNotes([]); }, [book, chapter]);

  const TabButton = ({ id, icon: Icon, label }: { id: Tab; icon: typeof Link2; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase transition-colors ${
        tab === id ? 'text-gold-bright' : 'text-gold-muted/50 hover:text-gold-muted'
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-sacred-black/70 z-40"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-gold-dark
                       rounded-t-2xl px-6 pt-4 pb-8 max-h-[78vh] flex flex-col"
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-gold-muted/30 mb-5 shrink-0" />

            <div className="flex items-center justify-between mb-5 shrink-0">
              <span className="text-[10px] tracking-[0.25em] uppercase text-gold-muted/70">
                {verseLabel}
              </span>
              <button onClick={onClose} className="text-gold-muted/50 hover:text-gold-muted">
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-6 border-b border-gold-dark/40 pb-3 mb-5 shrink-0">
              <TabButton id="refs" icon={Link2} label="Cross-references" />
              <TabButton id="notes" icon={ScrollText} label="Commentary" />
            </div>

            <div className="overflow-y-auto flex-1 -mx-1 px-1">
              {busy && (
                <div className="flex justify-center py-10">
                  <Loader2 size={16} className="animate-spin text-gold-muted/50" />
                </div>
              )}

              {!busy && tab === 'refs' && (
                refs.length ? (
                  <div className="space-y-4">
                    {refs.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => { onClose(); onOpenPassage(r.book, r.chapter); }}
                        className="block w-full text-left group"
                      >
                        <p className="text-gold-muted/60 text-[11px] tracking-wide mb-1
                                      group-hover:text-gold-bright transition-colors">
                          {r.reference}
                        </p>
                        <p className="text-gold-metallic text-sm leading-relaxed">{r.text}</p>
                      </button>
                    ))}
                    <p className="text-gold-muted/30 text-[10px] pt-2">
                      Cross-references from OpenBible.info
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-gold-muted/40 text-xs italic py-10">
                    No cross-references for this verse.
                  </p>
                )
              )}

              {!busy && tab === 'notes' && (
                notes.length ? (
                  <div className="space-y-3">
                    <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-3">
                      On {book === 'Psalms' ? 'Psalm' : book} {chapter}
                    </p>
                    {notes.map((para, i) =>
                      isHeading(para) ? (
                        <p key={i} className="text-gold-bright text-sm pt-3">{headingText(para)}</p>
                      ) : (
                        <p key={i} className="text-gold-metallic text-sm leading-[1.8]">{para}</p>
                      ),
                    )}
                    <p className="text-gold-muted/30 text-[10px] pt-3">
                      Matthew Henry's Complete Commentary, 1708–1710
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-gold-muted/40 text-xs italic py-10">
                    No commentary for this chapter.
                  </p>
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
