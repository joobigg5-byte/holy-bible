import { useState } from 'react';
import { breakDown, numericValue, type LetterBreakdown } from '@/data/alphabets';

/**
 * The letters of a Hebrew or Greek word, with what each one originally was.
 *
 * Historical only. The note at the foot exists because a popular teaching holds
 * that a word's meaning can be derived by combining its letters' pictures —
 * "father" as "strength of the house" from ox plus house. Hebraists reject it,
 * and an app that showed the pictures without saying so would be quietly
 * lending it weight.
 */
export function LetterOrigins({ lemma }: { lemma: string }) {
  const [open, setOpen] = useState<LetterBreakdown | null>(null);
  const letters = breakDown(lemma);
  if (!letters.length) return null;

  const isHebrew = Boolean(letters[0].hebrew);
  const value = numericValue(lemma);

  return (
    <div className="mt-6 pt-5 border-t border-gold-dark/40">
      <p className="text-gold-muted/50 text-[10px] tracking-widest uppercase mb-3">
        Letter by letter
      </p>

      {/* Hebrew reads right to left */}
      <div className={`flex flex-wrap gap-2 mb-4 ${isHebrew ? 'flex-row-reverse justify-end' : ''}`}>
        {letters.map((l, i) => (
          <button
            key={i}
            onClick={() => setOpen(open?.char === l.char && open === l ? null : l)}
            className={`flex flex-col items-center px-3 py-2 rounded border transition-colors ${
              open === l
                ? 'border-gold-bright text-gold-bright'
                : 'border-gold-dark/40 text-gold-metallic hover:border-gold-muted'
            }`}
          >
            <span className="text-2xl leading-none">{l.char}</span>
            <span className="text-[9px] tracking-wider uppercase mt-1.5 text-gold-muted/60">
              {l.hebrew?.name ?? l.greek?.name}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div className="border-l-2 border-gold-dark pl-4 mb-4">
          {open.hebrew && (
            <>
              <p className="text-gold-bright text-sm mb-1">
                {open.hebrew.name}
                <span className="text-gold-muted/50"> · {open.hebrew.sound}</span>
              </p>
              <p className="text-gold-metallic text-sm mb-2">
                Name means <span className="text-gold-bright">{open.hebrew.meaning}</span>
                <span className="text-gold-muted/50"> · numeric value {open.hebrew.value}</span>
              </p>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-gold-muted/50 text-[10px] tracking-widest uppercase">
                  Paleo-Hebrew
                </span>
                <span className="text-gold-metallic text-xl">{open.hebrew.paleo}</span>
              </div>
              <p className="text-gold-muted/70 text-xs leading-relaxed">
                {open.hebrew.origin}
                {open.hebrew.disputed && (
                  <span className="text-gold-muted/40"> Scholars do not agree on this one.</span>
                )}
              </p>
            </>
          )}

          {open.greek && !open.hebrew && (
            <>
              <p className="text-gold-bright text-sm mb-1">
                {open.greek.name}
                <span className="text-gold-muted/50"> · {open.greek.sound}</span>
              </p>
              <p className="text-gold-metallic text-sm mb-2">
                {open.greek.upper} {open.greek.lower}
                <span className="text-gold-muted/50"> · numeric value {open.greek.value}</span>
              </p>
              {open.greek.note && (
                <p className="text-gold-muted/70 text-xs leading-relaxed">{open.greek.note}</p>
              )}
            </>
          )}
        </div>
      )}

      <p className="text-gold-muted/40 text-[11px]">
        Letters also served as numerals; this word totals {value}.
      </p>

      {isHebrew && (
        <p className="text-gold-muted/30 text-[10px] leading-relaxed mt-3">
          The letters began as pictures and became sound-signs long before the
          biblical books were written. Combining those pictures to derive a
          word's meaning is a popular teaching but not one scholars accept —
          the shapes are shown here as history, not as a key to meaning.
        </p>
      )}

      {open?.hebrew && (
        <p className="text-gold-muted/25 text-[10px] mt-2">
          If the Paleo-Hebrew letter shows as a box, your device has no font for
          that ancient script.
        </p>
      )}
    </div>
  );
}
