import { useEffect, useState } from 'react';
import { Search, BookMarked, MapPin, Music, Sunrise, Heart, Compass } from 'lucide-react';
import { getDayInfo } from '@/services/churchYear';
import { getHymnOfDay, type Hymn } from '@/services/hymns';

/**
 * A quiet row on the home screen so the reader can see what the app holds
 * without hunting for it. Everything here also lives in Explore — this is the
 * signpost, not the shelf.
 */

const OPEN = () => window.dispatchEvent(new Event('open-discover'));

const SHORTCUTS = [
  { icon: Search,     label: 'Search' },
  { icon: BookMarked, label: 'Dictionary' },
  { icon: MapPin,     label: 'Places' },
  { icon: Music,      label: 'Hymns' },
  { icon: Sunrise,    label: 'Devotional' },
  { icon: Heart,      label: 'Salvation' },
];

export function HomeShortcuts() {
  const [season, setSeason] = useState<string | null>(null);
  const [hymn, setHymn] = useState<Hymn | null>(null);

  useEffect(() => {
    const info = getDayInfo();
    const until = info.daysUntil
      ? ` · ${info.daysUntil.days} days to ${info.daysUntil.name}`
      : '';
    setSeason(info.feast ? info.feast : `${info.season.name}${until}`);
    getHymnOfDay().then(setHymn).catch(() => undefined);
  }, []);

  return (
    <div className="mt-10">
      {season && (
        <p className="text-center text-[10px] tracking-[0.25em] uppercase text-gold-muted/40 mb-6">
          {season}
        </p>
      )}

      <div className="grid grid-cols-6 gap-0 max-w-md mx-auto">
        {SHORTCUTS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={OPEN}
            className="flex flex-col items-center gap-1.5 px-1 py-2 rounded
                       text-gold-muted/50 hover:text-gold-bright transition-colors"
          >
            <Icon size={16} />
            <span className="text-[8px] tracking-wide leading-tight text-center">{label}</span>
          </button>
        ))}
      </div>

      {hymn && (
        <button
          onClick={OPEN}
          className="block w-full text-center mt-6 text-xs text-gold-muted/50
                     hover:text-gold-bright transition-colors"
        >
          Hymn of the day · {hymn.title}
        </button>
      )}

      <button
        onClick={OPEN}
        className="flex items-center justify-center gap-1.5 w-full mt-4
                   text-[10px] tracking-[0.2em] uppercase text-gold-muted/35
                   hover:text-gold-bright transition-colors"
      >
        <Compass size={12} /> Explore everything
      </button>
    </div>
  );
}
