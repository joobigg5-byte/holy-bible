import { useState, useEffect } from 'react';
import { useTextSize } from '@/hooks/useTextSize';
import { getParallelPref, setParallelPref } from '@/services/parallelReading';
import { LANGUAGES, type LanguageCode } from '@/data/languages';

/**
 * Reading preferences for the Settings panel.
 * Uses the same toggle and label markup already in Index.tsx.
 */
export function ReaderSettings({ language }: { language: LanguageCode }) {
  const { size, setSize, options } = useTextSize();
  const [pref, setPref] = useState(getParallelPref);

  useEffect(() => { setPref(getParallelPref()); }, []);

  const update = (patch: Parameters<typeof setParallelPref>[0]) =>
    setPref(setParallelPref(patch));

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-12 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-gold-bright' : 'bg-gold-dark/40'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <>
      <div>
        <p className="text-gold-metallic text-sm font-medium mb-2">Text size</p>
        <div className="flex gap-2">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => setSize(o.id)}
              className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                size === o.id
                  ? 'border-gold-bright text-gold-bright'
                  : 'border-gold-dark/40 text-gold-muted/50 hover:text-gold-muted'
              }`}
              style={{ fontSize: `${0.68 * o.scale}rem` }}
            >
              A
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="pr-4">
          <p className="text-gold-metallic text-sm font-medium">Two languages side by side</p>
          <p className="text-gold-muted/40 text-xs mt-1">
            Read a second translation alongside the first
          </p>
        </div>
        <Toggle on={pref.enabled} onClick={() => update({ enabled: !pref.enabled })} />
      </div>

      {pref.enabled && (
        <div className="pl-4 border-l border-gold-dark/40 space-y-4">
          <div>
            <p className="text-gold-metallic text-sm font-medium mb-2">Second language</p>
            <select
              value={pref.secondary}
              onChange={(e) => update({ secondary: e.target.value as LanguageCode })}
              className="w-full bg-sacred-black border border-gold-dark rounded px-3 py-2
                         text-sm text-gold-metallic focus:outline-none focus:border-gold-muted"
            >
              {LANGUAGES.filter((l) => l.code !== language).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} · {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-gold-metallic text-sm">Scroll together</p>
            <Toggle
              on={pref.scrollTogether}
              onClick={() => update({ scrollTogether: !pref.scrollTogether })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="text-gold-metallic text-sm">Follow the audio</p>
              <p className="text-gold-muted/40 text-xs mt-1">
                Reads each verse in both languages in turn
              </p>
            </div>
            <Toggle
              on={pref.followAudio}
              onClick={() => update({ followAudio: !pref.followAudio })}
            />
          </div>
        </div>
      )}
    </>
  );
}
