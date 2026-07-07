import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      if (localStorage.getItem('install-banner-dismissed') === '1') return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('install-banner-dismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-[120px] left-0 right-0 z-40 px-4 pb-2">
      <div className="max-w-lg mx-auto bg-primary text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
        <Download className="h-5 w-5 flex-shrink-0" />
        <p className="flex-1 text-xs" style={{ fontFamily: 'Jost, sans-serif' }}>
          Installe Le Ré-seau sur ton écran d'accueil pour y accéder plus vite
        </p>
        <button onClick={handleInstall} className="text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full flex-shrink-0">
          Installer
        </button>
        <button onClick={handleDismiss} className="flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
