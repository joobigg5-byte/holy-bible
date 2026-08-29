import { useEffect, useState } from 'react';
import type { LanguageCode } from '@/data/languages';
import type { Verse } from '@/data/lectionary';
import { BibleService, type VerseSource } from '@/services/BibleService';

export type { VerseSource };

/**
 * Resolve a verse via the offline-first BibleService.
 * Returns the bundled fallback immediately, then upgrades when a better source loads.
 */
export function useBibleVerse(fallback: Verse, _passageId: string, language: LanguageCode) {
  const [verse, setVerse] = useState<Verse>(fallback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<VerseSource>('offline');

  useEffect(() => {
    let cancelled = false;

    // English KJV — bundled lectionary text is canonical, no fetch needed.
    if (language === 'kjv' && fallback.text) {
      setVerse(fallback);
      setSource('offline');
      setError(null);
      setLoading(false);
      return;
    }

    // Twi — use bundled translation when present.
    if (language === 'twi' && fallback.twi) {
      setVerse({ ...fallback, text: fallback.twi });
      setSource('offline');
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    BibleService.setTranslation(language);

    (async () => {
      const result = await BibleService.getVerse(
        fallback.book,
        fallback.chapter,
        fallback.verseStart,
        fallback.verseEnd,
        language,
      );
      if (cancelled) return;
      if (result.source === 'missing' || !result.text) {
        // Keep the bundled English text rather than showing nothing.
        setVerse(fallback);
        setSource('offline');
        setError('Translation unavailable; showing English.');
      } else {
        setVerse({
          ...fallback,
          text: result.text,
          reference: result.reference || fallback.reference,
        });
        setSource(result.source);
        setError(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [language, fallback]);

  return { verse, loading, error, source };
}
