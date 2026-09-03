import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, BookmarkCheck, Pencil, X } from 'lucide-react';
import { HIGHLIGHT_COLORS, type HighlightColor } from '@/hooks/useAnnotations';

interface VerseSheetProps {
  open: boolean;
  onClose: () => void;
  verseLabel: string;
  currentColor: HighlightColor | null;
  isBookmarked: boolean;
  hasNote: boolean;
  onSelectColor: (color: HighlightColor | null) => void;
  onToggleBookmark: () => void;
  onAddNote: () => void;
}

const COLORS: HighlightColor[] = ['gold', 'purple', 'blue', 'green'];

export function VerseSheet({
  open,
  onClose,
  verseLabel,
  currentColor,
  isBookmarked,
  hasNote,
  onSelectColor,
  onToggleBookmark,
  onAddNote,
}: VerseSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-sacred-black/70 z-overlay"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-sheet bg-card border-t border-gold-dark rounded-t-2xl px-6 pt-4 pb-8"
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-gold-muted/30 mb-5" />
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] tracking-[0.25em] uppercase text-gold-muted/70">
                {verseLabel}
              </span>
              <button onClick={onClose} className="text-gold-muted/50 hover:text-gold-muted">
                <X size={16} />
              </button>
            </div>

            {/* Highlight colors */}
            <div className="flex items-center justify-center gap-5 mb-7">
              {COLORS.map(color => {
                const active = currentColor === color;
                return (
                  <button
                    key={color}
                    onClick={() => onSelectColor(active ? null : color)}
                    aria-label={`Highlight ${color}`}
                    className={`w-9 h-9 rounded-full transition-all ${
                      active ? 'ring-2 ring-offset-2 ring-offset-card ring-gold-muted scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: HIGHLIGHT_COLORS[color] }}
                  />
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-around border-t border-gold-dark/40 pt-4">
              <button
                onClick={onAddNote}
                className="flex flex-col items-center gap-1.5 text-gold-muted/70 hover:text-gold-bright transition-colors"
              >
                <Pencil size={16} />
                <span className="text-[10px] tracking-[0.2em] uppercase">
                  {hasNote ? 'Edit Note' : 'Add Note'}
                </span>
              </button>
              <button
                onClick={onToggleBookmark}
                className="flex flex-col items-center gap-1.5 text-gold-muted/70 hover:text-gold-bright transition-colors"
              >
                {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                <span className="text-[10px] tracking-[0.2em] uppercase">
                  {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                </span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
