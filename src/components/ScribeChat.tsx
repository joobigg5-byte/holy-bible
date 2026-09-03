import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Anchor, Loader2 } from 'lucide-react';
import { searchScripture, type ScribeHit } from '@/services/scribeSearch';
import { AnchorView } from './AnchorView';
import type { LanguageCode } from '@/data/languages';
import { DEFAULT_LANGUAGE } from '@/data/languages';

interface ScribeChatProps {
  onClose: () => void;
  isVeil: boolean;
  /** Answer in the translation the reader is using. */
  language?: LanguageCode;
}

interface AnchorVerse {
  book: string;
  chapter: number;
  verseStart: number;
  text: string;
  translation: string;
  reference: string;
}

interface Message {
  role: 'user' | 'scribe';
  content?: string;
  hits?: ScribeHit[];
  question?: string;
}

/**
 * Reflective prompts, chosen by the shape of the question rather than by a
 * fixed topic list. These are framing only — every verse shown comes from
 * real retrieval, so the Scribe never invents a reference.
 */
const PROMPTS: Array<{ test: RegExp; ask: string }> = [
  {
    test: /\b(why|how come|reason)\b/i,
    ask: 'Sit with this a moment. What would change if the answer were not owed to you today?',
  },
  {
    test: /\b(should|ought|must|decide|decision|choose)\b/i,
    ask: 'What does the quietest part of you already know about this choice?',
  },
  {
    test: /\b(afraid|fear|scared|anxious|worry|worried|panic)\b/i,
    ask: 'What is the fear that stands before you this hour, and what would it look like to set it down?',
  },
  {
    test: /\b(sad|grief|grieving|lost|loss|died|death|mourn|alone|lonely)\b/i,
    ask: 'Where might comfort reach you, if you allowed it to?',
  },
  {
    test: /\b(angry|anger|hate|betray|unfair|resent)\b/i,
    ask: 'What would it cost you to lay this down, and what does carrying it cost already?',
  },
  {
    test: /\b(thank|grateful|joy|happy|blessed)\b/i,
    ask: 'Name one thing from today you would not have thought to ask for.',
  },
];

const FALLBACK_PROMPT =
  'Where does this meet your own life today?';

function reflectionFor(query: string): string {
  return PROMPTS.find((p) => p.test.test(query))?.ask ?? FALLBACK_PROMPT;
}

export function ScribeChat({ onClose, isVeil, language = DEFAULT_LANGUAGE }: ScribeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [anchorVerse, setAnchorVerse] = useState<AnchorVerse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, isSearching]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isSearching) return;

    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setInput('');
    setIsSearching(true);

    try {
      const hits = await searchScripture(query, language, 3);
      setMessages((prev) => [
        ...prev,
        hits.length
          ? { role: 'scribe', hits, question: reflectionFor(query) }
          : {
              role: 'scribe',
              content:
                'The scrolls hold nothing under those words. Try naming the thing itself — what you feel, or what you face.',
            },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'scribe', content: 'The scrolls are out of reach. Try again in a moment.' },
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const tone = isVeil ? 'text-gold-veil' : 'text-gold-metallic';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="fixed inset-0 bg-sacred-black z-sheet flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold-dark">
          <h2 className="font-book-name text-sm text-gold-muted tracking-[0.2em]">The Scribe</h2>
          <button
            onClick={onClose}
            className="text-gold-muted hover:text-gold-metallic transition-colors"
            aria-label="Close the Scribe"
          >
            <X size={20} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <p className="text-center text-gold-muted text-sm italic opacity-60 mt-12">
              Speak what weighs upon your heart…
            </p>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
              {msg.role === 'user' ? (
                <span className="inline-block bg-muted px-4 py-2 rounded text-sm text-gold-metallic">
                  {msg.content}
                </span>
              ) : msg.hits ? (
                <div className={`space-y-5 ${tone}`}>
                  {msg.hits.map((hit, j) => (
                    <div key={j} className="space-y-2">
                      <p className="text-base leading-[1.8] italic">"{hit.text}"</p>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-gold-muted">{hit.reference}</p>
                        <button
                          onClick={() =>
                            setAnchorVerse({
                              book: hit.book,
                              chapter: hit.chapter,
                              verseStart: hit.verse,
                              text: hit.text,
                              translation: language.toUpperCase(),
                              reference: hit.reference,
                            })
                          }
                          className="text-gold-muted hover:text-gold-bright transition-colors"
                          aria-label={`Read ${hit.reference} in context`}
                        >
                          <Anchor size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {msg.question && (
                    <p className="text-sm opacity-80 pt-2 border-t border-gold-dark/40">
                      {msg.question}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gold-muted italic">{msg.content}</p>
              )}
            </div>
          ))}

          {isSearching && (
            <div className="flex items-center gap-2 text-gold-muted text-sm italic">
              <Loader2 size={14} className="animate-spin" />
              Searching the scrolls…
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gold-dark">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
              placeholder="Ask the Scribe…"
              className="flex-1 bg-transparent border border-gold-dark rounded px-4 py-2 text-sm text-gold-metallic placeholder:text-gold-muted/40 focus:outline-none focus:border-gold-muted"
            />
            <button
              onClick={() => void handleSend()}
              disabled={isSearching}
              className="text-sm text-gold-muted hover:text-gold-bright transition-colors tracking-wider font-book-name disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </motion.div>

      {anchorVerse && <AnchorView verse={anchorVerse} onClose={() => setAnchorVerse(null)} />}
    </>
  );
}
