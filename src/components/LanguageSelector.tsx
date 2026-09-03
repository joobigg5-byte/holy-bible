import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, X } from 'lucide-react';
import { LANGUAGES, type LanguageCode } from '@/data/languages';

interface Props {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
}

export function LanguageSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === value) ?? LANGUAGES[0];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-gold-muted hover:text-gold-bright transition-colors"
        dir={current.rtl ? 'rtl' : 'ltr'}
      >
        <span>{current.nativeName}</span>
        <ChevronDown size={12} className="opacity-60" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-sacred-black/70 z-overlay"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
              className="fixed bottom-0 left-0 right-0 z-sheet bg-sacred-black border-t border-gold-dark rounded-t-2xl px-6 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]"
            >
              <div className="mx-auto w-10 h-1 rounded-full bg-gold-muted/30 mb-3" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] tracking-[0.3em] uppercase text-gold-muted/70">
                  Translation
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gold-muted/50 hover:text-gold-muted"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* All seventeen translations. Height is capped against the
                  viewport rather than a fixed value, and the sheet clears the
                  phone's home bar, so the last entry is always reachable. */}
              <ul className="divide-y divide-gold-dark/30 overflow-y-auto max-h-[min(60vh,26rem)] overscroll-contain">
                {LANGUAGES.map(lang => {
                  const active = lang.code === value;
                  return (
                    <li key={lang.code}>
                      <button
                        onClick={() => {
                          onChange(lang.code);
                          setOpen(false);
                        }}
                        dir={lang.rtl ? 'rtl' : 'ltr'}
                        className="w-full flex items-center justify-between py-3 group"
                        style={{ fontFamily: '"Crimson Pro", serif' }}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`text-base tracking-wide ${
                              active
                                ? 'text-gold-bright'
                                : 'text-gold-metallic group-hover:text-gold-bright'
                            }`}
                            style={active ? { color: '#FFD700' } : undefined}
                          >
                            {lang.nativeName}
                          </span>
                          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-muted/50">
                            {lang.label}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span
                            className={`text-[9px] tracking-[0.2em] uppercase ${
                              lang.offline ? 'text-gold-muted/70' : 'text-gold-muted/40'
                            }`}
                            title={lang.offline ? 'Available offline' : 'Online only'}
                          >
                            {lang.offline ? '📦 Offline' : '🌐 Online'}
                          </span>
                          {active && <Check size={14} style={{ color: '#FFD700' }} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}