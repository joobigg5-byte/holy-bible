/**
 * Verse reflection.
 *
 * This used to run distilgpt2 in the browser via @xenova/transformers: an 80 MB
 * model download on first use, ~1.2 MB of onnxruntime in every bundle, and
 * incoherent output — distilgpt2 cannot write a devotional. It has been
 * replaced with reflection grounded in scripture itself.
 *
 * A reflection is now: a reflective question keyed to the verse's own language,
 * plus a related passage found by the same retrieval engine the Scribe uses.
 * Instant, offline, and it never puts invented words in scripture's mouth.
 *
 * If you later want generated prose, do it behind a server endpoint holding the
 * API key — never a VITE_ variable, which ships the key in the bundle.
 */
import { useCallback, useState } from 'react';
import { searchScripture } from '@/services/scribeSearch';
import type { LanguageCode } from '@/data/languages';

interface Prompt {
  test: RegExp;
  question: string;
}

/** Matched against the verse text, so the question fits what was actually read. */
const PROMPTS: Prompt[] = [
  { test: /\b(fear|afraid|dismayed|terror|dread)\b/i,
    question: 'What fear does this speak to in you, and what would setting it down look like?' },
  { test: /\b(rest|peace|quiet|still|sleep)\b/i,
    question: 'Where in your day could you have accepted rest, and did not?' },
  { test: /\b(love|loved|beloved|charity|kindness)\b/i,
    question: 'Who has shown you this, and who is waiting for you to show it?' },
  { test: /\b(mercy|mercies|forgive|forgiven|pardon)\b/i,
    question: 'What are you still holding that this asks you to release?' },
  { test: /\b(strength|strong|power|might|uphold)\b/i,
    question: 'What are you carrying alone that was never yours to carry alone?' },
  { test: /\b(wait|patience|endure|steadfast|longsuffering)\b/i,
    question: 'What are you waiting on, and what would faithful waiting look like today?' },
  { test: /\b(light|lamp|shine|morning|dawn)\b/i,
    question: 'What became clearer to you today than it was yesterday?' },
  { test: /\b(trust|faith|believe|refuge|shield)\b/i,
    question: 'Where are you relying on your own footing rather than this?' },
  { test: /\b(joy|rejoice|praise|thanks|glad|bless)\b/i,
    question: 'Name one thing from today you would not have thought to ask for.' },
  { test: /\b(work|labour|diligent|hand|toil|reap)\b/i,
    question: 'What work in front of you deserves more care than you have been giving it?' },
  { test: /\b(sorrow|mourn|weep|tears|grief|broken)\b/i,
    question: 'What grief are you carrying, and who could help you carry it?' },
  { test: /\b(wisdom|understanding|counsel|knowledge|instruct)\b/i,
    question: 'What decision are you facing that this would change?' },
];

const DEFAULT_QUESTION = 'What does this ask of you before the day is out?';

function questionFor(text: string): string {
  return PROMPTS.find((p) => p.test.test(text))?.question ?? DEFAULT_QUESTION;
}

export interface Reflection {
  question: string;
  related?: { reference: string; text: string };
}

export function useAIReflection(language: LanguageCode = 'kjv') {
  const [isLoading, setIsLoading] = useState(false);

  /** Structured reflection — prefer this when you control the rendering. */
  const buildReflection = useCallback(
    async (verseText: string, reference: string): Promise<Reflection> => {
      setIsLoading(true);
      try {
        const question = questionFor(verseText);

        let related: Reflection['related'];
        try {
          const hits = await searchScripture(verseText, language, 2);
          const other = hits.find((h) => h.reference !== reference);
          if (other) related = { reference: other.reference, text: other.text };
        } catch {
          /* retrieval is optional — the question stands on its own */
        }

        return { question, related };
      } finally {
        setIsLoading(false);
      }
    },
    [language],
  );

  /**
   * Plain-text form, matching the previous signature so existing callers keep
   * working. Returns something worth saving to My Library.
   */
  const generateReflection = useCallback(
    async (verseText: string, reference: string): Promise<string> => {
      const { question, related } = await buildReflection(verseText, reference);
      const parts = [`${reference} — ${question}`];
      if (related) parts.push(`See also ${related.reference}: "${related.text}"`);
      return parts.join('\n\n');
    },
    [buildReflection],
  );

  return { generateReflection, buildReflection, isLoading };
}
