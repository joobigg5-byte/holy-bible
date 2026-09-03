/**
 * Lock-screen controls and a wake lock for spoken reading.
 *
 * Without this, playback stops the moment the screen turns off — which is
 * exactly when someone using the sleep timer needs it to continue. Two separate
 * browser features are needed:
 *
 *   MediaSession  puts play/pause and the reference on the lock screen, and
 *                 lets the hardware buttons work.
 *   Wake Lock     asks the screen to stay on, since speech synthesis is
 *                 suspended with the page on most phones.
 *
 * Both degrade quietly. Neither exists on iOS Safari for speech, where the OS
 * stops synthesis regardless — that is a platform limit, not something the app
 * can work around.
 */
import { useCallback, useEffect, useRef } from 'react';

interface Options {
  isPlaying: boolean;
  title: string;
  /** e.g. "Psalm 23" */
  album?: string;
  onPlay: () => void;
  onPause: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

type WakeLockSentinel = { release: () => Promise<void>; released: boolean };

export function useMediaSession({
  isPlaying, title, album, onPlay, onPause, onNext, onPrevious,
}: Options) {
  const lock = useRef<WakeLockSentinel | null>(null);

  // Handlers change every render; keep the latest without re-registering
  const handlers = useRef({ onPlay, onPause, onNext, onPrevious });
  useEffect(() => {
    handlers.current = { onPlay, onPause, onNext, onPrevious };
  });

  /* ---------------------------------------------------------- wake lock */

  const acquireLock = useCallback(async () => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
    };
    if (!nav.wakeLock || lock.current) return;
    try {
      lock.current = await nav.wakeLock.request('screen');
    } catch {
      /* denied, low battery, or unsupported — reading still works */
    }
  }, []);

  const releaseLock = useCallback(async () => {
    try {
      await lock.current?.release();
    } catch {
      /* already gone */
    }
    lock.current = null;
  }, []);

  useEffect(() => {
    if (isPlaying) void acquireLock();
    else void releaseLock();
    return () => { void releaseLock(); };
  }, [isPlaying, acquireLock, releaseLock]);

  // Android drops the wake lock when the tab is hidden; take it back on return
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isPlaying) void acquireLock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isPlaying, acquireLock]);

  /* ------------------------------------------------------ media session */

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;

    ms.metadata = new MediaMetadata({
      title,
      artist: album ?? 'The Holy Bible',
      album: 'The Holy Bible',
      artwork: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    ms.setActionHandler('play', () => handlers.current.onPlay());
    ms.setActionHandler('pause', () => handlers.current.onPause());
    ms.setActionHandler('stop', () => handlers.current.onPause());
    ms.setActionHandler('nexttrack', handlers.current.onNext ? () => handlers.current.onNext?.() : null);
    ms.setActionHandler('previoustrack', handlers.current.onPrevious ? () => handlers.current.onPrevious?.() : null);

    return () => {
      ms.setActionHandler('play', null);
      ms.setActionHandler('pause', null);
      ms.setActionHandler('stop', null);
      ms.setActionHandler('nexttrack', null);
      ms.setActionHandler('previoustrack', null);
    };
  }, [title, album]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  /**
   * Speech synthesis alone does not always keep the media session alive on
   * Android. A silent looping audio element convinces the OS that media is
   * genuinely playing, which keeps the lock-screen controls present.
   */
  useEffect(() => {
    if (!isPlaying) return;
    const el = document.createElement('audio');
    el.loop = true;
    el.volume = 0.001;
    // 0.1s of silence, inline so nothing extra has to be fetched
    el.src =
      'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA' +
      'gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgP//' +
      '//////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAA' +
      'AAAAJAAAAAAAAAAAAnGleuHZAAAAAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAE' +
      'TEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
      'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    el.play().catch(() => undefined);
    return () => {
      el.pause();
      el.src = '';
    };
  }, [isPlaying]);
}
