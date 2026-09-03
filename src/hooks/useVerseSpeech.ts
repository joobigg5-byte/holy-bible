/**
 * Speak a verse or a queue of verses.
 * Public API unchanged: { isSpeaking, currentVerseIndex, speak, stop, toggle }
 * plus a new `voiceAvailable` flag so the UI can dim the audio control.
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
  startWatchdog,
  stopWatchdog,
  warmUp,
  type ResolvedVoice,
} from '@/lib/speech';

interface VerseItem {
  n: number;
  t: string;
}

export function useVerseSpeech(language: LanguageCode) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);

  const tokenRef = useRef(0);
  const resolvedRef = useRef<ResolvedVoice | null>(null);

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    stopKeepAlive();
    stopWatchdog();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentVerseIndex(null);
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  // Resolve the voice whenever the language changes, and stop any playback.
  useEffect(() => {
    cancel();
    let alive = true;
    resolveVoice(language).then((r) => {
      if (!alive) return;
      resolvedRef.current = r;
      setVoiceAvailable(r.match !== 'unavailable');
    });
    return () => {
      alive = false;
    };
  }, [language, cancel]);

  const speak = useCallback(
    /**
     * `silent` suppresses the 'no voice' notice. Pass it for auto-play: a
     * reader who did not ask for audio should not be told it failed every
     * time they open the app.
     */
    async (textOrVerses: string | VerseItem[], opts?: { silent?: boolean }) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        if (!opts?.silent) toast({ description: 'Audio not supported in this browser.' });
        return;
      }

      warmUp();
      cancel();

      const resolved = resolvedRef.current ?? (await resolveVoice(language));
      resolvedRef.current = resolved;
      setVoiceAvailable(resolved.match !== 'unavailable');

      // No voice for this language: say so plainly rather than reading the
      // text aloud in English, which is what the old fallback did.
      if (resolved.match === 'unavailable') {
        if (!opts?.silent) {
          toast({
            description:
              `Your device has no ${languageNames[language]} speaking voice. ` +
              `The text is here and works offline — only the audio needs a voice, ` +
              `which you add under Text-to-speech in your phone's settings.`,
          });
        }
        return;
      }

      // Chrome swallows speak() if it lands too soon after cancel()
      await new Promise((r) => setTimeout(r, 60));

      const token = ++tokenRef.current;
      const queue: VerseItem[] =
        typeof textOrVerses === 'string'
          ? chunkText(textOrVerses, resolved.lang).map((t, i) => ({ n: i, t }))
          : textOrVerses.flatMap((v) =>
              chunkText(v.t, resolved.lang).map((t) => ({ n: v.n, t })),
            );

      if (!queue.length) return;

      setIsSpeaking(true);
      startKeepAlive();
      let i = 0;
      let advancing = false;

      const next = () => {
        if (token !== tokenRef.current) return;
        if (advancing) return;          // guard against onend and watchdog racing
        advancing = true;
        setTimeout(() => { advancing = false; }, 100);

        if (i >= queue.length) {
          stopKeepAlive();
          stopWatchdog();
          setIsSpeaking(false);
          setCurrentVerseIndex(null);
          return;
        }
        const item = queue[i++];
        setCurrentVerseIndex(item.n);

        const u = makeUtterance(item.t, resolved);
        if (!u) {
          stopKeepAlive();
          stopWatchdog();
          setIsSpeaking(false);
          return;
        }
        u.onend = next;
        u.onerror = (e) => {
          if (e.error === 'interrupted' || e.error === 'canceled') return;
          next();
        };
        window.speechSynthesis.speak(u);
      };

      // Android drops the queue after a few utterances without firing onend.
      // If the engine goes quiet while verses remain, push the next one.
      startWatchdog(
        () => token === tokenRef.current && i < queue.length,
        () => next(),
      );

      next();
    },
    [language, cancel],
  );

  const stop = useCallback(() => cancel(), [cancel]);

  const toggle = useCallback(
    (text: string) => {
      if (isSpeaking) stop();
      else void speak(text);
    },
    [isSpeaking, speak, stop],
  );

  return { isSpeaking, currentVerseIndex, voiceAvailable, speak, stop, toggle };
}
