"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useState, useCallback } from "react";
import { PlaneIcon, BarChartIcon, ClockIcon, UsersIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

import { ActivityPanel } from "@/components/ActivityFeed";

// Track unread comments for the logged-in user
function useUnreadComments(pathname: string): number {
  const [count, setCount] = useState(0);

  const check = useCallback(async () => {
    if (typeof window === "undefined") return;

    // Get user's PIN hash
    let myPinHash: string | null = null;
    try {
      const raw = localStorage.getItem("sponsortrack-pins");
      if (!raw) return;
      const store = JSON.parse(raw);
      const values = Object.values(store) as string[];
      myPinHash = values[0] || null;
    } catch { return; }
    if (!myPinHash) return;

    // Get last seen timestamp
    const lastSeen = localStorage.getItem("community-last-seen") || "2000-01-01T00:00:00Z";

    // Fetch apps + cohort comments
    try {
      const [appsRes, commentsRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/comments"),
      ]);
      const apps = await appsRes.json();
      const cohortComments = await commentsRes.json();
      if (!Array.isArray(apps) || !Array.isArray(cohortComments)) return;

      let unread = 0;

      // Find user's app IDs
      const myAppIds = new Set(
        apps.filter((a: { id: string; pin_hash: string }) => a.pin_hash === myPinHash).map((a: { id: string }) => a.id)
      );

      // Check entry-level comments on my entries
      apps.forEach((a: { id: string; comments?: { created_at: string; pin_hash: string }[] }) => {
        if (!myAppIds.has(a.id) || !a.comments) return;
        a.comments.forEach(c => {
          if (c.pin_hash !== myPinHash && c.created_at > lastSeen) unread++;
        });
      });

      // Check cohort comments — replies to my posts
      cohortComments.forEach((c: { pin_hash: string; parent_id: string | null; created_at: string }) => {
        if (c.pin_hash !== myPinHash && c.created_at > lastSeen && c.parent_id) {
          // Check if parent is mine
          const parent = cohortComments.find((p: { id: string }) => p.id === c.parent_id);
          if (parent && (parent as { pin_hash: string }).pin_hash === myPinHash) unread++;
        }
      });

      setCount(unread);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { check(); }, [check]);

  // Clear when visiting community page
  useEffect(() => {
    if (pathname.startsWith("/community")) {
      localStorage.setItem("community-last-seen", new Date().toISOString());
      setCount(0);
    }
  }, [pathname]);

  // Re-check periodically (every 60s)
  useEffect(() => {
    const interval = setInterval(check, 300000);
    return () => clearInterval(interval);
  }, [check]);

  return count;
}

function MeIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChatIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
}

const DESKTOP_NAV = [
  { href: "/dashboard", label: "Tracker", icon: PlaneIcon },
  { href: "/stats", label: "Stats", icon: BarChartIcon },
  { href: "/calculator", label: "Estimator", icon: ClockIcon },
  { href: "/community", label: "Community", icon: ChatIcon },
  { href: "/me", label: "Me", icon: MeIcon },
];

const BOTTOM_NAV = [
  { href: "/dashboard", label: "Tracker", icon: PlaneIcon },
  { href: "/stats", label: "Stats", icon: BarChartIcon },
  { href: "/calculator", label: "Estimator", icon: ClockIcon },
  { href: "/community", label: "Community", icon: ChatIcon },
  { href: "/me", label: "Me", icon: MeIcon },
];

/** Desktop top nav with sliding pill */
function DesktopTabs({ pathname, unreadCount }: { pathname: string; unreadCount: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const activeIdx = DESKTOP_NAV.findIndex(item => pathname.startsWith(item.href));

  useEffect(() => {
    if (!containerRef.current || activeIdx < 0) return;
    const tabs = containerRef.current.querySelectorAll<HTMLAnchorElement>("a[data-tab]");
    const el = tabs[activeIdx];
    if (el) {
      setPill({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeIdx]);

  return (
    <nav ref={containerRef} className="hidden sm:flex items-center gap-0.5 bg-sand-50 rounded-xl p-1 border border-sand-200 relative shadow-[0_1px_2px_rgba(26,26,24,0.04)]">
      {/* Sliding pill */}
      <div
        className="absolute top-1 h-[calc(100%-8px)] bg-brand-500 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-0 shadow-[0_2px_8px_rgba(45,106,79,0.25)]"
        style={{ left: `${pill.left}px`, width: `${pill.width}px`, opacity: activeIdx >= 0 ? 1 : 0 }}
      />
      {DESKTOP_NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            scroll={true}
            onClick={() => window.scrollTo(0, 0)}
            data-tab
            className={cn(
              "relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors duration-200",
              active ? "text-white" : "text-sand-500 hover:text-sand-800"
            )}
          >
            <item.icon size={14} />
            <span>{item.label}</span>
            {item.href === "/community" && unreadCount > 0 && (
              <span className={cn(
                "w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center leading-none",
                active ? "bg-white text-brand-600" : "bg-error text-white"
              )}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile bottom nav with sliding pill + haptic tap */
function MobileBottomNav({ pathname, unreadCount }: { pathname: string; unreadCount: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const [tapped, setTapped] = useState<string | null>(null);
  const activeIdx = BOTTOM_NAV.findIndex(item => pathname.startsWith(item.href));

  useEffect(() => {
    if (!containerRef.current || activeIdx < 0) return;
    const tabs = containerRef.current.querySelectorAll<HTMLAnchorElement>("a[data-btab]");
    const el = tabs[activeIdx];
    if (el) {
      setPill({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeIdx]);

  const handleTap = (href: string) => {
    setTapped(href);
    // Haptic feedback on supported devices
    if (navigator.vibrate) navigator.vibrate(8);
    setTimeout(() => setTapped(null), 200);
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-sand-200 safe-area-bottom">
      <div ref={containerRef} className="flex items-center justify-around px-2 py-1.5 relative">
        {/* Sliding highlight */}
        <div
          className="absolute top-1 h-[calc(100%-8px)] bg-brand-500/10 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-0"
          style={{ left: `${pill.left}px`, width: `${pill.width}px`, opacity: activeIdx >= 0 ? 1 : 0 }}
        />
        {BOTTOM_NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const isTapped = tapped === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              scroll={true}
              data-btab
              onClick={() => { handleTap(item.href); window.scrollTo(0, 0); }}
              className={cn(
                "relative z-10 flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] transition-transform duration-150",
                isTapped ? "scale-90" : "scale-100"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 relative",
                active ? "bg-brand-500 shadow-[0_2px_8px_rgba(45,106,79,0.3)]" : ""
              )}>
                <item.icon
                  size={16}
                  className={cn(
                    "transition-colors duration-200",
                    active ? "text-white" : "text-sand-400"
                  )}
                />
                {item.href === "/community" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-error text-white text-[7px] font-bold flex items-center justify-center leading-none border-2 border-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[9px] font-semibold transition-colors duration-200",
                active ? "text-brand-600" : "text-sand-400"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    const saved = localStorage.getItem("sponsortrack-theme") as "light" | "dark" | "system" | null;
    setTheme(saved || "system");
  }, []);

  const applyTheme = useCallback((t: "light" | "dark" | "system") => {
    const isDark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#0E0E0D" : "#2D6A4F");
  }, []);

  const cycle = () => {
    const order: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    const next = order[(order.indexOf(theme) + 1) % 3];
    setTheme(next);
    localStorage.setItem("sponsortrack-theme", next);
    applyTheme(next);
  };

  // Listen for OS theme changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((localStorage.getItem("sponsortrack-theme") || "system") === "system") {
        applyTheme("system");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [applyTheme]);

  return (
    <button onClick={cycle} className="w-8 h-8 rounded-lg flex items-center justify-center text-sand-500 hover:text-sand-800 hover:bg-sand-100 transition-all"
      aria-label="Toggle theme" title={`Theme: ${theme}`}>
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/><path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"/>
        </svg>
      ) : theme === "light" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
        </svg>
      )}
    </button>
  );
}

export function Nav() {
  const pathname = usePathname();
  const unreadCount = useUnreadComments(pathname);

  // Force scroll to top on every route change — aggressive approach
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const forceTop = () => {
      window.scrollTo(0, 1); // iOS Safari trick — slight offset forces recalculate
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    forceTop();
    const t1 = requestAnimationFrame(forceTop);
    const t2 = setTimeout(forceTop, 50);
    const t3 = setTimeout(forceTop, 150);
    const t4 = setTimeout(forceTop, 300);
    return () => { cancelAnimationFrame(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [pathname]);

  return (
    <>
      <header className="bg-white/85 backdrop-blur-md border-b border-sand-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <BrandMark />
            <span className="font-bold text-[15px] tracking-tight text-sand-900 group-hover:text-brand-600 transition-colors">
              SponsorTrack
            </span>
          </Link>
          <DesktopTabs pathname={pathname} unreadCount={unreadCount} />
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <ActivityPanel />
          </div>
        </div>
      </header>
      <MobileBottomNav pathname={pathname} unreadCount={unreadCount} />
    </>
  );
}

/** Small inline brand mark — three progressing dots crossed by a gold arrow,
 *  echoing assets/sponsortrack-icon.svg at chrome scale. */
function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] bg-brand-500 shadow-[0_2px_6px_rgba(45,106,79,0.25)]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        {/* progression dots, faint → bold */}
        <circle cx="5" cy="12" r="1.8" fill="rgba(255,255,255,0.35)" />
        <circle cx="12" cy="12" r="2.2" fill="rgba(255,255,255,0.65)" />
        <circle cx="19" cy="12" r="2.6" fill="#FFFFFF" />
        {/* gold arrow */}
        <path d="M3 12 H21" stroke="#D4A03C" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M18 8.5 L21.5 12 L18 15.5" stroke="#D4A03C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* check on the last dot */}
        <path d="M17.5 12 L18.6 13.1 L20.6 11" stroke="#2D6A4F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </span>
  );
}
