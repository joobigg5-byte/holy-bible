/**
 * Listen for spoken scripture references.
 *
 * Runs continuous speech recognition and watches for a reference in what it
 * hears. When the preacher says "Romans chapter eight verse twenty-eight", the
 * verse is fetched and handed back for display.
 *
 * Limits worth knowing:
 *   - Chrome and Edge only. Safari and Firefox have no SpeechRecognition.
 *   - It needs a connection: recognition runs on the browser vendor's servers,
 *     not on the device. Everything else in this app works offline; this
 *     cannot.
 *   - It needs microphone permission, granted once per site.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { findReferences, formatRef, type SpokenRef } from '@/services/spokenReference';

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function makeRecognition(): Recognition | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export const listeningSupported = () =>
  typeof window !== 'undefined' &&
  Boolean(
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
  );

export type ListenState = 'off' | 'starting' | 'listening' | 'denied' | 'unsupported' | 'error';

interface Options {
  /** Fired once per newly heard reference. */
  onReference: (ref: SpokenRef) => void;
  lang?: string;
}

export function useVerseListener({ onReference, lang = 'en-US' }: Options) {
  const [state, setState] = useState<ListenState>('off');
  const [heard, setHeard] = useState('');
  const [lastRef, setLastRef] = useState<string | null>(null);

  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const seen = useRef<string>('');
  const cb = useRef(onReference);
  useEffect(() => { cb.current = onReference; });

  const stop = useCallback(() => {
    wanted.current = false;
    try { rec.current?.stop(); } catch { /* already stopped */ }
    rec.current = null;
    setState('off');
    setHeard('');
  }, []);

  const start = useCallback(() => {
    if (!listeningSupported()) { setState('unsupported'); return; }
    const r = makeRecognition();
    if (!r) { setState('unsupported'); return; }

    wanted.current = true;
    setState('starting');
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang;

    r.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript + ' ';
      }
      setHeard(text.trim().slice(-90));
      setState('listening');

      const refs = findReferences(text);
      if (!refs.length) return;
      // The last one spoken is the live one
      const ref = refs[refs.length - 1];
      const key = formatRef(ref);
      if (key === seen.current) return;   // don't re-fire while it repeats
      seen.current = key;
      setLastRef(key);
      cb.current(ref);
    };

    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wanted.current = false;
        setState('denied');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setState('error');
      }
    };

    // Recognition stops itself after a pause; restart while still wanted
    r.onend = () => {
      if (!wanted.current) { setState('off'); return; }
      try { r.start(); } catch { /* restarting too fast; the next end will retry */ }
    };

    rec.current = r;
    try { r.start(); } catch { setState('error'); }
  }, [lang]);

  useEffect(() => () => { wanted.current = false; try { rec.current?.abort(); } catch { /* gone */ } }, []);

  const toggle = useCallback(() => {
    if (state === 'off' || state === 'error') start();
    else stop();
  }, [state, start, stop]);

  /** Allow the same reference to fire again, for a deliberate re-show. */
  const forget = useCallback(() => { seen.current = ''; }, []);

  return { state, heard, lastRef, start, stop, toggle, forget };
}
