import { useState } from 'react';
import { ImageDown, Loader2, Check } from 'lucide-react';
import { shareVerseImage } from '@/services/verseImage';

/**
 * Share the day's verse as an image, drawn in the reader's current theme.
 *
 * Sharing the app spreads a link; sharing a verse spreads the verse — and
 * carries the app's look into someone else's conversation.
 */
export function ShareVerseButton({
  text, reference, translation,
}: { text: string; reference: string; translation?: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle');

  const run = async () => {
    if (state === 'working') return;
    setState('working');
    const result = await shareVerseImage({ text, reference, translation });
    setState(result === 'failed' ? 'idle' : 'done');
    if (result !== 'failed') setTimeout(() => setState('idle'), 2200);
  };

  return (
    <button
      onClick={run}
      disabled={state === 'working'}
      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-gold-dark
                 text-gold-muted hover:text-gold-bright hover:border-gold-muted
                 transition-colors text-sm disabled:opacity-60"
    >
      {state === 'working' ? <Loader2 size={15} className="animate-spin" />
        : state === 'done' ? <Check size={15} />
        : <ImageDown size={15} />}
      {state === 'done' ? 'Shared' : 'Share Verse'}
    </button>
  );
}
