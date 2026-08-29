/**
 * Download a whole language for offline use, or remove it to reclaim space.
 *
 * Bible text is not precached — a global audience shouldn't pull 34 MB of
 * fifteen languages to read one. This lets a reader opt into the language
 * they actually use.
 */
import { useCallback, useEffect, useState } from 'react';
import { BIBLE_BOOKS } from '@/data/bibleBooks';
import type { LanguageCode } from '@/data/languages';

/** Must match FOLDERS in BibleService.ts and LOCAL_BIBLE_FOLDERS in bibleReader.ts. */
const FOLDERS: Record<LanguageCode, string> = {
  kjv: 'en_kjv',
  twi: 'twi_akuapem',
  yor: 'yoruba',
  swa: 'swahili',
  rv1960: 'spanish_rv1960',
  jfa: 'portuguese_jfa',
  lsg: 'french_lsg',
  it: 'italian',
  de: 'german',
  ja: 'japanese',
  chi: 'chinese_cuv',
  hin: 'hindi',
  rus: 'russian_synodal',
  zul: 'zulu',
  svd: 'arabic',
  nld: 'dutch',
  kor: 'korean',
};

const bookSlugs = () => BIBLE_BOOKS.map((b) => b.name.toLowerCase().replace(/ /g, '_'));

export type PackState = 'idle' | 'downloading' | 'ready' | 'unsupported';

export function useLanguagePack(language: LanguageCode) {
  const [state, setState] = useState<PackState>('idle');
  const [progress, setProgress] = useState(0); // 0–1

  const folder = FOLDERS[language];

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      setState('unsupported');
      return;
    }
    setState('idle');
    setProgress(0);

    const onMessage = (event: MessageEvent) => {
      const d = event.data || {};
      if (d.folder !== folder) return;
      if (d.type === 'LANGUAGE_PROGRESS') {
        setProgress(d.total ? d.loaded / d.total : 0);
        setState('downloading');
      }
      if (d.type === 'LANGUAGE_READY') {
        setProgress(1);
        setState('ready');
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [folder]);

  const download = useCallback(async () => {
    if (!folder || !('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) return;
    setState('downloading');
    setProgress(0);
    reg.active.postMessage({ type: 'CACHE_LANGUAGE', folder, books: bookSlugs() });
  }, [folder]);

  const remove = useCallback(async () => {
    if (!folder || !('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'DELETE_LANGUAGE', folder });
    setState('idle');
    setProgress(0);
  }, [folder]);

  return { state, progress, download, remove };
}
