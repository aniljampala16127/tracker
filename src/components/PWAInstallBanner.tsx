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
      <div className="max-w-md mx-auto bg-white border border-sand-200 rounded-2xl p-4 shadow-xl shadow-black/15">
        {installed ? (
          <div className="text-center py-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500 mb-2 shadow-md shadow-brand-500/25">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12"/></svg>
            </div>
            <div className="text-[14px] font-bold text-sand-900 tracking-tight">Installed</div>
            <div className="text-[12px] text-sand-500 mt-0.5">Open SponsorTrack from your home screen.</div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] bg-brand-500 flex-shrink-0 shadow-md shadow-brand-500/25"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="5" cy="12" r="1.8" fill="rgba(255,255,255,0.35)" />
                <circle cx="12" cy="12" r="2.2" fill="rgba(255,255,255,0.65)" />
                <circle cx="19" cy="12" r="2.6" fill="#FFFFFF" />
                <path d="M3 12 H21" stroke="#D4A03C" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M18 8.5 L21.5 12 L18 15.5" stroke="#D4A03C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M17.5 12 L18.6 13.1 L20.6 11" stroke="#2D6A4F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-0.5">SponsorTrack</p>
              <div className="text-[14px] font-bold text-sand-900 tracking-tight">Add to home screen</div>
              {isIOS ? (
                <p className="text-[11px] text-sand-500 mt-1 leading-relaxed">
                  Tap the share button
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mx-1 -mt-0.5 text-brand-600">
                    <path d="M4 12V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V12" /><path d="M16 6L12 2L8 6" /><path d="M12 2V15" />
                  </svg>
                  then "Add to Home Screen".
                </p>
              ) : (
                <p className="text-[11px] text-sand-500 mt-1">
                  Get instant access and check AOR updates faster.
                </p>
              )}
              <div className="flex items-center gap-2 mt-2.5">
                {!isIOS && (
                  <button
                    onClick={handleInstall}
                    className="px-4 py-1.5 bg-brand-500 text-white text-[12px] font-semibold rounded-lg hover:bg-brand-600 transition-all active:scale-[0.97] shadow-[0_4px_12px_rgba(45,106,79,0.18)]"
                  >
                    Install
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-[11px] text-sand-500 hover:text-sand-800 font-semibold uppercase tracking-wider transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="w-7 h-7 -mt-1 -mr-1 rounded-md flex items-center justify-center text-sand-400 hover:text-sand-700 hover:bg-sand-100 transition-colors" aria-label="Dismiss">
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
