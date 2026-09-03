import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Link2, ScrollText, Languages } from 'lucide-react';
import { getCrossRefs, type CrossRef } from '@/services/crossRefs';
import { getCommentary, isHeading, headingText } from '@/services/commentary';
import { getTokens, lookup, findOccurrences, renderings,
  type Token, type LexEntry, type Occurrence } from '@/services/strongs';
import { LetterOrigins } from '@/components/LetterOrigins';
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

type Tab = 'refs' | 'notes' | 'original';

export function VerseStudy({
  open, onClose, book, chapter, verse, verseLabel, language, onOpenPassage,
}: Props) {
  const [tab, setTab] = useState<Tab>('refs');
  const [refs, setRefs] = useState<CrossRef[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [entry, setEntry] = useState<LexEntry | null>(null);
  const [uses, setUses] = useState<Occurrence[] | null>(null);
  const [findingUses, setFindingUses] = useState(false);

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

  // Original-language tagging follows the KJV word order, so it is loaded
  // per verse rather than per chapter.
  useEffect(() => {
    if (!open || tab !== 'original') return;
    setEntry(null); setUses(null); setBusy(true);
    getTokens(book, chapter, verse).then((t) => { setTokens(t); setBusy(false); });
  }, [open, tab, book, chapter, verse]);

  const chooseWord = async (num: string) => {
    setUses(null);
    setEntry(await lookup(num));
    setFindingUses(true);
    setUses(await findOccurrences(num, 40));
    setFindingUses(false);
  };

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
            className="fixed inset-0 bg-sacred-black/70 z-overlay"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-sheet bg-card border-t border-gold-dark
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
              <TabButton id="original" icon={Languages} label="Original" />
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 -mx-1 px-1">
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

              {!busy && tab === 'original' && (
                tokens.length ? (
                  <>
                    <p className="text-gold-metallic text-[0.95rem] leading-[2] mb-5">
                      {tokens.map((t, i) =>
                        t.s?.length ? (
                          <button
                            key={i}
                            onClick={() => chooseWord(t.s![0])}
                            className={`transition-colors border-b border-dotted ${
                              t.i ? 'italic' : ''
                            } ${
                              entry && t.s.includes(entry.number)
                                ? 'text-gold-bright border-gold-bright'
                                : 'text-gold-metallic border-gold-dark hover:text-gold-bright'
                            }`}
                          >
                            {t.w}
                          </button>
                        ) : (
                          <span key={i} className={t.i ? 'italic text-gold-muted/70' : ''}>{t.w}</span>
                        ),
                      )}
                    </p>

                    <p className="text-gold-muted/40 text-[11px] italic mb-4">
                      Words in italics were supplied by the KJV translators and have
                      nothing behind them in the Hebrew or Greek.
                    </p>

                    {!entry && (
                      <p className="text-gold-muted/40 text-[11px] italic">
                        Tap any underlined word for the Hebrew or Greek behind it.
                      </p>
                    )}

                    {entry && (
                      <div className="border-t border-gold-dark/40 pt-5">
                        <p
                          dir={entry.language === 'Hebrew' ? 'rtl' : 'ltr'}
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

                        <LetterOrigins lemma={entry.lemma} />

                        {uses && uses.length > 0 && (
                          <>
                            <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-2">
                              Translated as
                            </p>
                            <p className="text-gold-metallic text-sm mb-5">
                              {renderings(uses).slice(0, 12)
                                .map((r) => `${r.word} (${r.count})`).join(' · ')}
                            </p>
                            <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-2">
                              Where it appears
                            </p>
                            <div className="space-y-1">
                              {uses.slice(0, 30).map((o, i) => (
                                <button
                                  key={i}
                                  onClick={() => { onClose(); onOpenPassage(o.book, o.chapter); }}
                                  className="block w-full text-left text-[12px] text-gold-muted/70
                                             hover:text-gold-bright transition-colors"
                                >
                                  {o.reference}<span className="text-gold-muted/40"> — {o.word}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}

                        {findingUses && (
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
                  </>
                ) : (
                  <p className="text-center text-gold-muted/40 text-xs italic py-10">
                    No original-language tagging for this verse.
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
