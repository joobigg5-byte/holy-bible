import type { Verse } from '@/data/lectionary';

interface AnchorViewProps {
  verse: Verse;
  onClose: () => void;
}

export function AnchorView({ verse, onClose }: AnchorViewProps) {
  return (
    <div
      className="fixed inset-0 bg-sacred-black z-50 flex flex-col items-center justify-center px-8 cursor-pointer"
      onClick={onClose}
    >
      <p className="text-lg sm:text-xl leading-[1.8] text-gold-metallic text-center max-w-lg italic">
        "{verse.text}"
      </p>
      <p className="mt-12 text-xs text-gold-muted tracking-[0.15em] text-center opacity-50">
        {verse.translation} — Read-Only Source Text — Verse {verse.reference}
      </p>
    </div>
  );
}
