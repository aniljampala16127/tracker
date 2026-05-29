"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

/**
 * Cross-fade + subtle vertical lift on every route change.
 * Outgoing page fades + lifts up; the new page fades in from
 * slightly below, settling into place. iOS easing throughout
 * so the motion matches the rest of the app.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  // "out" = current page leaving | "in" = new page arriving | "idle" = rest
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current === pathname) {
      setDisplayChildren(children);
      return;
    }

    // 1. Lift + fade out the old page
    setPhase("out");
    const outTimer = setTimeout(() => {
      // 2. Swap content, scroll to top, prep for incoming animation
      setDisplayChildren(children);
      prevPath.current = pathname;
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        // 3. Start "in" phase on next frame so the transition catches
        setPhase("in");
        requestAnimationFrame(() => setPhase("idle"));
      });
    }, 160);
    return () => clearTimeout(outTimer);
  }, [pathname, children]);

  // Per-phase classes — same easing curve as the nav pill so the whole
  // app speaks one motion language.
  const cls = phase === "out"
    ? "opacity-0 -translate-y-1"
    : phase === "in"
      ? "opacity-0 translate-y-1"
      : "opacity-100 translate-y-0";

  return (
    <div
      className={`transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform] ${cls}`}
    >
      {displayChildren}
    </div>
  );
}
