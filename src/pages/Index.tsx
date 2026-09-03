import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Sparkles, Volume2, VolumeX, X, RotateCcw, Bell,
} from 'lucide-react';
import { ScribalVerse } from '@/components/ScribalVerse';
import { LibraryPanel } from '@/components/LibraryPanel';
import { ProjectionView } from '@/components/ProjectionView';
import { ReaderSettings } from '@/components/ReaderSettings';
import { HomeShortcuts } from '@/components/HomeShortcuts';
import { SupportLink, SupportIcon } from '@/components/SupportButton';
import { Attribution } from '@/components/Attribution';
import { ScribeChat } from '@/components/ScribeChat';
import { LanguageSelector } from '@/components/LanguageSelector';
import { NotesPanel } from '@/components/NotesPanel';
import { BottomNav } from '@/components/BottomNav';
import { useStreak } from '@/hooks/useStreak';
import { useVeilMode } from '@/hooks/useVeilMode';
import { useVerseSpeech } from '@/hooks/useVerseSpeech';
import { useDailyNotification } from '@/hooks/useDailyNotification';
import { InstallButton } from '@/components/InstallButton';
import { ShareButton } from '@/components/ShareButton';
import { ShareVerseButton } from '@/components/ShareVerseButton';
import { getTodaysVerse, getWatchLabel, type Verse } from '@/data/lectionary';
import { fetchVerseText } from '@/services/bibleReader';
import { DEFAULT_LANGUAGE, type LanguageCode } from '@/data/languages';
import { detectLanguage } from '@/services/detectLanguage';
import { toast } from '@/hooks/use-toast';

const LANG_KEY = 'preferredLanguage';
const CONTINUE_VISITS_KEY = 'continueReading:visits';
const MAX_CONTINUE_VISITS = 3;
const AUTO_PLAY_KEY = 'aihb_autoplay';

export default function Index() {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
    // First visit: start in the reader's own language rather than English.
    // Once they choose anything, that choice wins for good.
    return (localStorage.getItem(LANG_KEY) as LanguageCode | null) ?? detectLanguage();
  });

  const [scribeOpen, setScribeOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [silence, setSilence] = useState(false);
  const [anchorOpen, setAnchorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const [continueVisits, setContinueVisits] = useState(0);
  const [recentChapter, setRecentChapter] = useState<{ book: string; chapter: number } | null>(null);

  const [autoPlay, setAutoPlay] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(AUTO_PLAY_KEY) !== 'false';
  });
  const [isMuted, setIsMuted] = useState(false);
  const { isSpeaking, speak, stop } = useVerseSpeech(language);
  const hasAutoPlayedRef = useRef(false);

  const { count: streak } = useStreak();
  const { isVeil } = useVeilMode();
  const todayData = useRef(getTodaysVerse()).current;
  const watchLabel = getWatchLabel(todayData.watch);

  const [displayVerse, setDisplayVerse] = useState<Verse>(todayData.verse);
  const [fetching, setFetching] = useState(false);
  const fetchingRef = useRef(false);

  // Notifications
  const { isEnabled: notifEnabled, toggleNotification } = useDailyNotification(language);

  // Listen for bottom nav events
  useEffect(() => {
    const openLibrary = () => setNotesOpen(true);   // Library = your notes, as before
    const openNotes = () => { setLibraryOpen(false); setNotesOpen(true); };
    const openDiscover = () => setLibraryOpen(true);   // Explore = everything else
    const openProjection = () => setProjecting(true);
    const openSettings = () => setSettingsOpen(true);
    const toggleSilence = () => setSilence(prev => !prev);
    window.addEventListener('open-library', openLibrary);
    window.addEventListener('open-notes', openNotes);
    window.addEventListener('open-discover', openDiscover);
    window.addEventListener('open-projection', openProjection);
    window.addEventListener('open-settings', openSettings);
    window.addEventListener('toggle-silence', toggleSilence);
    return () => {
      window.removeEventListener('open-library', openLibrary);
      window.removeEventListener('open-notes', openNotes);
      window.removeEventListener('open-discover', openDiscover);
      window.removeEventListener('open-projection', openProjection);
      window.removeEventListener('open-settings', openSettings);
      window.removeEventListener('toggle-silence', toggleSilence);
    };
  }, []);

  // Fetch verse text for the current language
  const loadVerse = useCallback(async (lang: LanguageCode) => {
    if (lang === 'kjv') {
      setDisplayVerse(todayData.verse);
      return;
    }
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setFetching(true);
    try {
      const text = await fetchVerseText(
        lang,
        todayData.verse.book,
        todayData.verse.chapter,
        todayData.verse.verseStart,
        todayData.verse.verseEnd,
      );
      if (text) {
        setDisplayVerse({ ...todayData.verse, text, translation: lang.toUpperCase() });
      } else {
        setDisplayVerse(todayData.verse);
        toast({ description: 'Translation unavailable, showing English.' });
      }
    } catch (err) {
      console.error('Fetch failed', err);
      setDisplayVerse(todayData.verse);
      toast({ description: 'Could not load translation.' });
    } finally {
      setFetching(false);
      fetchingRef.current = false;
    }
  }, [todayData.verse]);

  useEffect(() => {
    loadVerse(language);
  }, [language, loadVerse]);

  // Auto-play
  useEffect(() => {
    if (autoPlay && !isMuted && displayVerse?.text && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      const timer = setTimeout(() => speak(displayVerse.text, { silent: true }), 800);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, isMuted, displayVerse.text, speak]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
  }, [language]);
  useEffect(() => {
    localStorage.setItem(AUTO_PLAY_KEY, String(autoPlay));
  }, [autoPlay]);

  useEffect(() => {
    const visits = parseInt(localStorage.getItem(CONTINUE_VISITS_KEY) || '0', 10);
    setContinueVisits(visits);
    const stored = localStorage.getItem('bibleReader:position');
    if (stored) {
      try { setRecentChapter(JSON.parse(stored)); } catch {}
    }
  }, []);

  const incrementContinueVisits = () => {
    const next = continueVisits + 1;
    setContinueVisits(next);
    localStorage.setItem(CONTINUE_VISITS_KEY, String(next));
  };

  const openBookBrowser = () => (window.location.href = '/read');

  const toggleMute = () => {
    if (isSpeaking) stop();
    setIsMuted(!isMuted);
  };

  const handleReListen = () => {
    if (displayVerse?.text) {
      stop();
      setTimeout(() => speak(displayVerse.text), 100);
    }
  };

  if (silence) {
    return (
      <div
        className="fixed inset-0 z-takeover bg-sacred-black overflow-y-auto cursor-pointer"
        onClick={() => setSilence(false)}
      >
        <div className="max-w-2xl mx-auto px-6 py-16">
          {fetching ? (
            <div className="text-center py-12 text-gold-muted animate-pulse">Loading verse...</div>
          ) : (
            <ScribalVerse verse={displayVerse} language={language} isVeil={isVeil} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-sacred-black text-gold-bright font-serif ${isVeil ? 'veil-mode' : ''} pb-16`}>
      {/* Clean header */}
      <header className="sticky top-0 z-20 bg-sacred-black/95 backdrop-blur border-b border-gold-dark/40">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <span className="text-[10px] tracking-[0.3em] uppercase text-gold-muted/60">{watchLabel}</span>
          <div className="flex items-center gap-1">
            <button onClick={toggleMute} className="p-2 text-gold-muted/60 hover:text-gold-bright transition-colors" title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={toggleNotification}
              className="p-2 text-gold-muted/60 hover:text-gold-bright transition-colors"
              title={notifEnabled ? 'Disable daily notifications' : 'Enable daily notifications'}
            >
              <Bell size={18} className={notifEnabled ? 'text-gold-bright' : ''} />
            </button>
            <SupportIcon />
            <span className="text-gold-muted/40 text-xs">Day {streak}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {fetching ? (
          <div className="text-center py-12 text-gold-muted animate-pulse">Loading verse...</div>
        ) : (
          <ScribalVerse verse={displayVerse} language={language} isVeil={isVeil} />
        )}
        <div className="mt-2 mb-6 flex justify-center">
          <LanguageSelector value={language} onChange={setLanguage} />
        </div>

        <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
          <button onClick={openBookBrowser} className="flex items-center gap-2 px-6 py-3 bg-gold-dark/20 border border-gold-dark/40 rounded-full text-gold-bright text-sm font-medium hover:bg-gold-dark/30 transition-all">
            <BookOpen size={16} /> Read the Bible
          </button>
          <button onClick={() => setScribeOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-gold-dark/20 border border-gold-dark/40 rounded-full text-gold-bright text-sm font-medium hover:bg-gold-dark/30 transition-all">
            <Sparkles size={16} /> Ask the Scribe
          </button>
          {!isSpeaking && displayVerse?.text && (
            <button onClick={handleReListen} className="flex items-center gap-2 px-4 py-3 bg-gold-dark/20 border border-gold-dark/40 rounded-full text-gold-bright text-sm font-medium hover:bg-gold-dark/30 transition-all" title="Repeat verse">
              <RotateCcw size={16} /> Re-listen
            </button>
          )}
        </div>

        {/* Install & Share row */}
        <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
          <InstallButton />
          <ShareButton />
          <ShareVerseButton
            text={displayVerse.text}
            reference={displayVerse.reference}
            translation={language.toUpperCase()}
          />
        </div>

        {recentChapter && continueVisits < MAX_CONTINUE_VISITS && (
          <div className="mt-6 text-center">
            <button onClick={() => { incrementContinueVisits(); localStorage.setItem('bibleReader:position', JSON.stringify({ book: recentChapter.book, chapter: recentChapter.chapter })); window.location.href = '/read'; }} className="text-xs text-gold-muted/60 hover:text-gold-bright transition-colors">
              Continue Reading · {recentChapter.book} {recentChapter.chapter}
            </button>
          </div>
        )}

        <HomeShortcuts />

        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-1 text-[10px] text-gold-muted/40">
            {isSpeaking ? '🔊 Speaking...' : isMuted ? '🔇 Muted' : '🎧 Ready'}
          </span>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Settings panel */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-sheet bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30 }} onClick={e => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-sacred-black border-l border-gold-dark/40 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gold-dark/40 shrink-0">
                <h2 className="text-gold-bright text-lg font-serif">Settings</h2>
                <button onClick={() => setSettingsOpen(false)} className="p-2 text-gold-muted/60 hover:text-gold-bright transition-colors"><X size={20} /></button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-6
                              pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-metallic text-sm font-medium">Auto-play verse</p>
                    <p className="text-gold-muted/40 text-xs mt-1">Verse speaks automatically when app opens</p>
                  </div>
                  <button onClick={() => setAutoPlay(!autoPlay)} className={`w-12 h-6 rounded-full transition-colors ${autoPlay ? 'bg-gold-bright' : 'bg-gold-dark/40'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoPlay ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div>
                  <p className="text-gold-metallic text-sm font-medium mb-2">Language</p>
                  <LanguageSelector value={language} onChange={setLanguage} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gold-metallic text-sm font-medium">Veil Mode</p>
                    <p className="text-gold-muted/40 text-xs mt-1">Reveals words one by one</p>
                  </div>
                  <span className="text-gold-muted/40 text-xs">{isVeil ? 'Active' : 'Inactive'}</span>
                </div>
                <ReaderSettings language={language} />
                <div className="pt-2">
                  <SupportLink />
                </div>
                <Attribution />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProjectionView
        open={projecting}
        onClose={() => setProjecting(false)}
        language={language}
      />

      <LibraryPanel
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        language={language}
        onOpenPassage={(book, chapter) => {
          setLibraryOpen(false);
          // ReadBible restores from this key on mount
          localStorage.setItem('bibleReader:position', JSON.stringify({ book, chapter }));
          window.location.href = '/read';
        }}
      />
      {scribeOpen && <ScribeChat isVeil={isVeil} onClose={() => setScribeOpen(false)} />}
      {notesOpen && <NotesPanel isOpen={notesOpen} onClose={() => setNotesOpen(false)} />}
    </div>
  );
}