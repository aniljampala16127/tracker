"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitioning, setTransitioning] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setTransitioning(true);
      const timeout = setTimeout(() => {
        setDisplayChildren(children);
        setTransitioning(false);
        prevPath.current = pathname;

        // Scroll to top AFTER new page content is rendered
        // This is the correct timing — after the 120ms fade transition
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        // Extra attempt after paint to beat iOS Safari scroll restoration
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
        });
      }, 120);
      return () => clearTimeout(timeout);
    } else {
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  return (
    <div
      className={`transition-opacity duration-200 ease-out ${
        transitioning ? "opacity-0" : "opacity-100"
      }`}
    >
      {displayChildren}
    </div>
  );
}
