import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Holy Bible',
          text: 'Experience the Bible daily with AI Holy Bible. Download it now!',
          url: window.location.origin,
        });
      } catch (err) {
        // user cancelled or error – ignore
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('Failed to copy: ', e);
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-4 py-2 bg-gold-dark/20 border border-gold-dark/40 rounded-full text-gold-bright text-sm font-medium hover:bg-gold-dark/30 transition-all"
      title="Share app"
    >
      {copied ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
      {copied ? 'Link Copied!' : 'Share App'}
    </button>
  );
}