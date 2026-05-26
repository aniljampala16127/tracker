"use client";

import { useEffect, useState } from "react";

const COUNTRY_KEY = "sponsortrack-user-country";
const PIN_KEY = "sponsortrack-pins";

type ApiApp = { id: string; pin_hash: string | null; country_origin: string };

/**
 * Buy Me a Coffee link in the footer — hidden for India users because
 * BMC doesn't take INR/UPI and is friction.
 *
 * Detection order:
 *  1. Read sponsortrack-user-country from localStorage (set by submit /
 *     /me / /calculator flows). Instant.
 *  2. If absent but the user has tracked PINs, fetch /api/applications
 *     and infer country from a matched entry. Cached back to localStorage.
 *  3. If still unknown (visitor with no tracked entries), default to
 *     showing BMC.
 */
export function SupportLink() {
  // null = still deciding, true = show BMC, false = hide
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    const cached = (localStorage.getItem(COUNTRY_KEY) || "").trim().toLowerCase();
    if (cached) {
      setShow(cached !== "india");
      return;
    }

    let pinHashes: string[] = [];
    try {
      const raw = localStorage.getItem(PIN_KEY);
      const store = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      pinHashes = Object.values(store);
    } catch { /* corrupted store — fall through to default */ }

    if (pinHashes.length === 0) {
      setShow(true);
      return;
    }

    // Visitor has tracked entries but country isn't cached — fetch once.
    let cancelled = false;
    fetch("/api/applications")
      .then(r => r.ok ? r.json() : [])
      .then((apps: ApiApp[]) => {
        if (cancelled || !Array.isArray(apps)) return;
        const mine = apps.find(a => a.pin_hash && pinHashes.includes(a.pin_hash));
        if (mine?.country_origin) {
          try { localStorage.setItem(COUNTRY_KEY, mine.country_origin); } catch {}
          setShow(mine.country_origin.trim().toLowerCase() !== "india");
        } else {
          setShow(true);
        }
      })
      .catch(() => { if (!cancelled) setShow(true); });

    return () => { cancelled = true; };
  }, []);

  if (show !== true) return null;
  return (
    <a
      href="https://buymeacoffee.com/aniljampala"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block mt-1.5 text-sand-400 hover:text-brand-600 transition-colors"
    >
      Support this project
    </a>
  );
}
