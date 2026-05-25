"use client";

import { useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import { Toaster } from "@/components/Toaster";

const OLD_DOMAIN = "tracker-lime-five.vercel.app";
const NEW_DOMAIN = "sponsortrack.online";

function useDomainMigration() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const host = window.location.hostname;

    // OLD DOMAIN: read PINs → redirect to new domain with PINs in URL
    if (host === OLD_DOMAIN) {
      const raw = localStorage.getItem("sponsortrack-pins");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Object.keys(parsed).length > 0) {
            const encoded = btoa(raw);
            window.location.replace(`https://${NEW_DOMAIN}?migrate=${encoded}`);
            return;
          }
        } catch { /* fall through */ }
      }
      // No PINs — redirect to homepage
      window.location.replace(`https://${NEW_DOMAIN}`);
      return;
    }

    // NEW DOMAIN: check for ?migrate param → save PINs → redirect to /me
    if (host === NEW_DOMAIN || host === "localhost") {
      const params = new URLSearchParams(window.location.search);
      const migrate = params.get("migrate");
      if (migrate) {
        try {
          const decoded = atob(migrate);
          const pins = JSON.parse(decoded);
          if (typeof pins === "object" && pins !== null) {
            const existing = JSON.parse(localStorage.getItem("sponsortrack-pins") || "{}");
            const merged = { ...existing, ...pins };
            localStorage.setItem("sponsortrack-pins", JSON.stringify(merged));
          }
        } catch { /* ignore */ }
        // Clean URL and go to /me
        window.location.replace(`https://${NEW_DOMAIN}/me`);
        return;
      }
    }
  }, []);
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  useDomainMigration();

  return (
    <>
      {/* Widened content on xl+ screens. Mobile/sm/md stay max-w-5xl
          so existing layouts don't shift. xl bumps to 1152px, 2xl to
          1280px — uses horizontal space without making text lines too
          long for comfortable reading. */}
      <main className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6">
        <PageTransition>{children}</PageTransition>
      </main>
      <Toaster />
    </>
  );
}
