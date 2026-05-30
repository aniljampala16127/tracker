"use client";

import { IRCC_GLOSSARY } from "@/lib/glossary";

/**
 * Wraps an IRCC acronym/jargon term with a definition tooltip. Renders the
 * label with a subtle dotted underline so users know it's explainable.
 *
 * - Desktop: hover shows a custom styled tooltip via .help-tip CSS.
 * - Mobile: long-press shows the native browser title.
 * - Screen readers get the aria-label.
 *
 * Usage: <HelpLabel term="aor">AOR</HelpLabel>
 */
export function HelpLabel({
  term,
  children,
  className,
}: {
  term: string;
  children: React.ReactNode;
  className?: string;
}) {
  const tip = IRCC_GLOSSARY[term.toLowerCase()];
  if (!tip) return <>{children}</>;
  return (
    <span
      className={`help-tip cursor-help underline decoration-dotted decoration-sand-400 underline-offset-[3px] ${className ?? ""}`}
      title={tip}
      aria-label={`${typeof children === "string" ? children : term}: ${tip}`}
      data-tip={tip}
    >
      {children}
    </span>
  );
}
