/**
 * Source credits.
 *
 * Two of the datasets in this app are CC BY 4.0, which permits use freely but
 * REQUIRES attribution. This component satisfies that condition — drop it into
 * your Settings screen and leave it visible.
 *
 * Everything else here is public domain and credited as a courtesy rather than
 * an obligation.
 */

import { BUILD } from '@/data/buildInfo';

interface Source {
  what: string;
  credit: string;
  url?: string;
  /** True when the licence makes the credit mandatory rather than polite. */
  required?: boolean;
}

const SOURCES: Source[] = [
  {
    what: 'Cross-references',
    credit: 'OpenBible.info, in part from the Treasury of Scripture Knowledge (CC BY 4.0)',
    url: 'https://www.openbible.info/labs/cross-references/',
    required: true,
  },
  {
    what: 'Dictionary',
    credit:
      "Easton's Bible Dictionary (1897) and Smith's Bible Dictionary (1884), via the NEUU dataset from CCEL (CC BY 4.0)",
    url: 'https://www.ccel.org/',
    required: true,
  },
  {
    what: 'Commentary',
    credit: "Matthew Henry's Complete Commentary (1708–1710). Public domain.",
  },
  {
    what: 'Devotional',
    credit: 'C. H. Spurgeon, Morning and Evening (1865). Public domain.',
  },
  {
    what: 'Hymns',
    credit: 'Classic gospel hymnody. Public domain.',
  },
  {
    what: 'Ancient writings',
    credit:
      "1 Enoch and others in R. H. Charles's translations, from OSIS editions of public-domain texts.",
  },
  {
    what: 'Scripture',
    credit:
      'Seventeen translations, all public domain except where noted in the language list.',
  },
];

export function Attribution() {
  return (
    <section className="px-6 py-6 border-t border-gold-dark">
      <h3 className="font-book-name text-xs text-gold-muted tracking-[0.2em] uppercase mb-4">
        Sources
      </h3>

      <ul className="space-y-3">
        {SOURCES.map((s) => (
          <li key={s.what} className="text-xs leading-relaxed">
            <span className="text-gold-metallic">{s.what}</span>
            <span className="text-gold-muted"> — </span>
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-muted hover:text-gold-bright transition-colors underline decoration-gold-dark underline-offset-2"
              >
                {s.credit}
              </a>
            ) : (
              <span className="text-gold-muted">{s.credit}</span>
            )}
          </li>
        ))}
      </ul>

      <p className="text-[10px] text-gold-muted/50 mt-6 tracking-wider">
        Build {BUILD.id} · {BUILD.date} · {BUILD.translations} translations ·{' '}
        {BUILD.features.length} features
      </p>

      <p className="text-[10px] text-gold-muted/60 mt-3 leading-relaxed">
        Scripture text is drawn from public-domain translations and has been
        checked for completeness, but errors are possible in any transcription.
        Please report anything that looks wrong.
      </p>
    </section>
  );
}
