"use client";

import { Download, Check, Info } from "lucide-react";
import { useState, useEffect } from "react";

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Explicitly register service worker to guarantee PWA recognition
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      navigator.serviceWorker.register(`${basePath}/sw.js`).catch((err) => console.error('SW registration failed:', err));
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    // Check if device is iOS (for showing custom add-to-homescreen instructions if needed)
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if the event fired before React hydrated
    if (typeof window !== 'undefined' && (window as any).deferredPWAEvent) {
      setDeferredPrompt((window as any).deferredPWAEvent);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      if (typeof window !== 'undefined') {
        (window as any).deferredPWAEvent = e;
      }
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 mt-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold w-fit border border-emerald-200 dark:border-emerald-500/20">
        <Check className="w-3.5 h-3.5" />
        App installed successfully
      </div>
    );
  }

  if (!deferredPrompt) {
    // If not supported (e.g. Safari on iOS) or already installed but not running as standalone
    if (isIOS) {
      return (
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 px-3 py-1.5 rounded-full text-xs font-semibold w-fit border border-neutral-200 dark:border-neutral-700/50">
            <Info className="w-3.5 h-3.5" />
            Tap 'Share' and 'Add to Home Screen' to install
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 mt-2 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 px-3 py-1.5 rounded-full text-xs font-semibold w-fit border border-neutral-200 dark:border-neutral-700/50">
        <Download className="w-3.5 h-3.5" />
        Install from your browser menu for offline access
      </div>
    );
  }

  return (
    <button 
      onClick={handleInstallClick}
      className="flex items-center gap-2 mt-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-full text-xs font-semibold w-fit border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
    >
      <Download className="w-3.5 h-3.5" />
      Install the app (PWA) for offline viewing
    </button>
  );
}
