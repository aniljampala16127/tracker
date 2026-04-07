"use client";

import { useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";

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
        } catch { /* fall through to simple redirect */ }
      }
      // No PINs — redirect to homepage (has PIN reconnect input)
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
            // Merge with existing PINs (don't overwrite)
            const existing = JSON.parse(localStorage.getItem("sponsortrack-pins") || "{}");
            const merged = { ...existing, ...pins };
            localStorage.setItem("sponsortrack-pins", JSON.stringify(merged));
          }
        } catch { /* ignore bad data */ }
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
    <main className="max-w-5xl mx-auto px-4 py-6">
      <PageTransition>{children}</PageTransition>
    </main>
  );
}
