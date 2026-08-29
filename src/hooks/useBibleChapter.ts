import { useEffect, useState } from 'react';
import type { LanguageCode } from '@/data/languages';
import { loadChapter, type Chapter, type FetchSource } from '@/services/bibleReader';

export function useBibleChapter(translation: LanguageCode, book: string, chapter: number) {
  const [data, setData] = useState<Chapter>({});
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<FetchSource>('cache');
  const [fellBack, setFellBack] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadChapter(translation, book, chapter)
      .then(res => {
        if (cancelled) return;
        setData(res.chapter);
        setSource(res.source);
        setFellBack(res.fellBackToEnglish);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [translation, book, chapter]);

  return { data, loading, source, fellBack };
}
