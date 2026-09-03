import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Library, Compass, Eye, Settings } from 'lucide-react';

export function BottomNav() {
  const location = useLocation();

  const linkClass = (path: string) =>
    `flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-1 ${
      location.pathname === path ? 'text-gold-bright' : 'text-gold-muted/60'
    }`;

  return (
    <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 z-[60] bg-sacred-black border-t border-gold-dark/40">
      <div className="max-w-2xl mx-auto flex justify-around py-2">
        <Link to="/" className={linkClass('/')}>
          <Home size={18} />
          <span className="text-[9px] tracking-wider">Home</span>
        </Link>
        <Link to="/read" className={linkClass('/read')}>
          <BookOpen size={18} />
          <span className="text-[9px] tracking-wider">Read</span>
        </Link>
        <button
          onClick={() => window.dispatchEvent(new Event('open-library'))}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-1 text-gold-muted/60 hover:text-gold-bright"
        >
          <Library size={18} />
          <span className="text-[9px] tracking-wider">Library</span>
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event('open-discover'))}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-1 text-gold-muted/60 hover:text-gold-bright"
        >
          <Compass size={18} />
          <span className="text-[9px] tracking-wider">Explore</span>
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event('toggle-silence'))}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-1 text-gold-muted/60 hover:text-gold-bright"
        >
          <Eye size={18} />
          <span className="text-[9px] tracking-wider">Silence</span>
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event('open-settings'))}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-1 text-gold-muted/60 hover:text-gold-bright"
        >
          <Settings size={18} />
          <span className="text-[9px] tracking-wider">Settings</span>
        </button>
      </div>
    </nav>
  );
}