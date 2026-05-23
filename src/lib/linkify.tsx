import React from "react";

// Matches http://, https://, or bare www. URLs.
// We greedy-match URL characters then trim trailing sentence punctuation
// in code, so "see https://example.com." doesn't include the period.
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const TRAILING_PUNCT = /[.,;:!?)\]}>'"]+$/;

/**
 * Convert plain text into a React node array with URLs rendered as
 * clickable links. Safe — never uses dangerouslySetInnerHTML.
 *
 * Used in CommentsSection (entry comments) and the Community thread
 * components, so people can paste IRCC links / forum links etc. and have
 * them be clickable instead of "https://www.canada.ca/en/…"-style plain
 * text that requires copy/paste.
 */
export function linkifyText(text: string | null | undefined): React.ReactNode {
  if (!text) return text;

  const out: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;

  while ((m = URL_RE.exec(text)) !== null) {
    const start = m.index;
    let raw = m[0];
    let trailing = "";

    // Pull off trailing punctuation so "https://x.com." renders the link
    // as "x.com" and leaves the "." as text.
    const trail = raw.match(TRAILING_PUNCT);
    if (trail) {
      trailing = trail[0];
      raw = raw.slice(0, raw.length - trailing.length);
    }
    // Skip degenerate empty matches.
    if (!raw) {
      lastIdx = start + (m[0] || "").length;
      continue;
    }

    if (start > lastIdx) out.push(text.slice(lastIdx, start));

    // Resolve the actual href (add https for bare www. matches).
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    // Display: drop the protocol so it reads cleanly; truncate long URLs
    // with an ellipsis but keep the full URL in the href.
    let display = raw.replace(/^https?:\/\//i, "");
    if (display.length > 42) display = display.slice(0, 38) + "…";

    out.push(
      <a
        key={`u-${start}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-brand-600 hover:text-brand-700 underline underline-offset-2 decoration-brand-500/40 hover:decoration-brand-500 break-words"
      >
        {display}
      </a>
    );

    if (trailing) out.push(trailing);
    lastIdx = start + m[0].length;
  }

  if (lastIdx < text.length) out.push(text.slice(lastIdx));
  return out.length > 0 ? out : text;
}
