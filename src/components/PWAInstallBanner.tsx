"use client";

import { useState, useEffect } from "react";

const DISMISSED_KEY = "sponsortrack-pwa-dismissed";

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed recently (7 days)
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Don't show if already in standalone mode (already installed)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS detection — show manual instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setShowBanner(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setInstalled(true);
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
      setTimeout(() => setShowBanner(false), 2000);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 z-50 animate-in">
      <div className="max-w-md mx-auto bg-white border border-sand-200 rounded-2xl p-4 shadow-xl shadow-black/10">
        {installed ? (
          <div className="text-center py-2">
            <div className="text-sm font-bold text-brand-600">Installed!</div>
            <div className="text-xs text-sand-500">Open SponsorTrack from your home screen</div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-sand-900">Add to Home Screen</div>
              {isIOS ? (
                <p className="text-[11px] text-sand-500 mt-0.5 leading-relaxed">
                  Tap the share button
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mx-1 -mt-0.5">
                    <path d="M4 12V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V12" /><path d="M16 6L12 2L8 6" /><path d="M12 2V15" />
                  </svg>
                  then &quot;Add to Home Screen&quot;
                </p>
              ) : (
                <p className="text-[11px] text-sand-500 mt-0.5">
                  Get instant access and check AOR updates faster
                </p>
              )}
              <div className="flex items-center gap-2 mt-2.5">
                {!isIOS && (
                  <button
                    onClick={handleInstall}
                    className="px-4 py-1.5 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-600 transition-all active:scale-[0.97]"
                  >
                    Install
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs text-sand-500 hover:text-sand-700 font-medium transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-sand-400 hover:text-sand-600 transition-colors -mt-1 -mr-1 p-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18" /><path d="M6 6L18 18" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
