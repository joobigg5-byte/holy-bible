import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsIOS(/iPhone|iPad|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      console.log('🎉 beforeinstallprompt fired!');
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    console.log('📦 InstallButton mounted, waiting for beforeinstallprompt...');

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleClick = async () => {
    console.log('👆 Install button clicked');
    console.log('deferredPrompt:', !!deferredPrompt, 'isIOS:', isIOS);

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('User choice:', outcome);
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSTip(true);
    } else {
      alert(
        'Installation is not supported on this browser. ' +
        'Try Chrome or Edge, or open this page on an Android device.'
      );
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-6 py-3 bg-gold-dark/20 border border-gold-dark/40 rounded-full text-gold-bright text-sm font-medium hover:bg-gold-dark/30 transition-all"
      >
        <Download size={16} />
        Install App
      </button>

      {showIOSTip && (
        <div
          className="fixed inset-0 z-sheet flex items-center justify-center bg-black/60"
          onClick={() => setShowIOSTip(false)}
        >
          <div
            className="bg-sacred-black border border-gold-dark rounded-xl p-6 max-w-xs mx-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gold-metallic text-sm mb-4">
              Add this app to your Home Screen:<br />
              <strong className="text-gold-bright">Tap the Share button</strong>{' '}
              (square with arrow) at the bottom of Safari, then scroll down and
              tap <strong className="text-gold-bright">“Add to Home Screen”.</strong>
            </p>
            <button
              onClick={() => setShowIOSTip(false)}
              className="px-4 py-2 bg-gold-bright/20 border border-gold-bright/40 rounded-full text-gold-bright text-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}