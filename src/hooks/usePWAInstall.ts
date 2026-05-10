import { useState, useEffect } from 'react';

let deferredPrompt: any = null;
let hasFiredBeforeInstallPrompt = false;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  hasFiredBeforeInstallPrompt = true;
  console.log('[PWA] beforeinstallprompt fired globally');
});

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (hasFiredBeforeInstallPrompt) {
      setCanInstall(true);
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[PWA] No deferredPrompt available to install');
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        alert("To install Mazha.Live on your iPhone or iPad:\n\n1. Tap the Share icon at the bottom of the screen.\n2. Scroll down and tap 'Add to Home Screen'.");
      }
      return false;
    }
    console.log('[PWA] Prompting install...');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
      return true;
    }
    deferredPrompt = null;
    return false;
  };

  useEffect(() => {
    console.log('[PWA] State updated:', { canInstall, isInstalled });
  }, [canInstall, isInstalled]);

  return { canInstall, isInstalled, install };
}
