"use client";

import { useEffect, useState } from "react";

const COUNTRY_KEY = "sponsortrack-user-country";

/**
 * Buy Me a Coffee link in the footer — hidden for India users because
 * BMC doesn't take INR/UPI and is friction. The user's country is written
 * to localStorage when they create or claim an entry.
 */
export function SupportLink() {
  const [show, setShow] = useState<boolean>(false);

  useEffect(() => {
    const country = (localStorage.getItem(COUNTRY_KEY) || "").trim().toLowerCase();
    setShow(country !== "india");
  }, []);

  if (!show) return null;
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
