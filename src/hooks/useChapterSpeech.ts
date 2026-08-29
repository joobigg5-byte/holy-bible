/**
 * Read a whole chapter aloud, verse by verse.
 * Public API unchanged: { isSpeaking, currentVerse, start, stop, toggle }
 * plus a new `voiceAvailable` flag.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import type { LanguageCode } from '@/data/languages';
import { languageNames } from '@/data/languages';
import {
  resolveVoice,
  makeUtterance,
  chunkText,
  startKeepAlive,
  stopKeepAlive,
  warmUp,
  type ResolvedVoice,
} from '@/lib/speech';

interface Chunk {
  n: number;
  text: string;
}

export function useChapterSpeech(language: LanguageCode) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentVerse, setCurrentVerse] = useState<number | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);

  const queueRef = useRef<Chunk[]>([]);
  const idxRef = useRef(0);
  const tokenRef = useRef(0);
  const resolvedRef = useRef<ResolvedVoice | null>(null);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    stopKeepAlive();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    queueRef.current = [];
    idxRef.current = 0;
    setIsSpeaking(false);
    setCurrentVerse(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    stop();
    let alive = true;
    resolveVoice(language).then((r) => {
      if (!alive) return;
      resolvedRef.current = r;
      setVoiceAvailable(r.match !== 'unavailable');
    });
    return () => {
      alive = false;
    };
  }, [language, stop]);

  const playFrom = useCallback((token: number) => {
    const resolved = resolvedRef.current;
    if (!resolved?.voice) return;

    const step = () => {
      if (token !== tokenRef.current) return;
      const item = queueRef.current[idxRef.current];
      if (!item) {
        stopKeepAlive();
        setIsSpeaking(false);
        setCurrentVerse(null);
        return;
      }
      setCurrentVerse(item.n);

      const u = makeUtterance(item.text, resolved);
      if (!u) return;
      u.onend = () => {
        idxRef.current += 1;
        step();
      };
      u.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        idxRef.current += 1;
        step();
      };
      window.speechSynthesis.speak(u);
    };

    step();
  }, []);

  const start = useCallback(
    async (verses: { n: number; t: string }[]) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        toast({ description: 'Audio not supported in this browser.' });
        return;
      }
      if (!verses.length) return;

      warmUp();
      stop();

      const resolved = resolvedRef.current ?? (await resolveVoice(language));
      resolvedRef.current = resolved;
      setVoiceAvailable(resolved.match !== 'unavailable');

      if (resolved.match === 'unavailable') {
        toast({
          description: `No ${languageNames[language]} voice installed on this device.`,
        });
        return;
      }

      await new Promise((r) => setTimeout(r, 60));

      // Split long verses so Chrome doesn't cut out partway through
      queueRef.current = verses.flatMap((v) =>
        chunkText(v.t, resolved.lang).map((text) => ({ n: v.n, text })),
      );
      idxRef.current = 0;

      const token = ++tokenRef.current;
      setIsSpeaking(true);
      startKeepAlive();
      playFrom(token);
    },
    [language, stop, playFrom],
  );

  const toggle = useCallback(
    (verses: { n: number; t: string }[]) => {
      if (isSpeaking) stop();
      else void start(verses);
    },
    [isSpeaking, start, stop],
  );

  return { isSpeaking, currentVerse, voiceAvailable, start, stop, toggle };
}
