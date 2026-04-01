"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { PlaneIcon, BarChartIcon, ClockIcon, UsersIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

import { ActivityPanel } from "@/components/ActivityFeed";

function MeIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const DESKTOP_NAV = [
  { href: "/dashboard", label: "Tracker", icon: PlaneIcon },
  { href: "/stats", label: "Stats", icon: BarChartIcon },
  { href: "/calculator", label: "Estimator", icon: ClockIcon },
  { href: "/compare", label: "Compare", icon: UsersIcon },
  { href: "/me", label: "Me", icon: MeIcon },
];

const BOTTOM_NAV = [
  { href: "/dashboard", label: "Tracker", icon: PlaneIcon },
  { href: "/stats", label: "Stats", icon: BarChartIcon },
  { href: "/calculator", label: "Estimator", icon: ClockIcon },
  { href: "/me", label: "Me", icon: MeIcon },
];

/** Desktop top nav with sliding pill */
function DesktopTabs({ pathname }: { pathname: string }) {
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
    <nav ref={containerRef} className="hidden sm:flex items-center gap-0.5 bg-sand-50 rounded-lg p-0.5 border border-sand-200 relative">
      {/* Sliding pill */}
      <div
        className="absolute top-0.5 h-[calc(100%-4px)] bg-brand-500 rounded-md transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-0"
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
              "relative z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors duration-200",
              active ? "text-white" : "text-sand-500 hover:text-sand-800"
            )}
          >
            <item.icon size={13} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile bottom nav with sliding pill + haptic tap */
function MobileBottomNav({ pathname }: { pathname: string }) {
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
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300",
                active ? "bg-brand-500 shadow-[0_2px_8px_rgba(45,106,79,0.3)]" : ""
              )}>
                <item.icon
                  size={16}
                  className={cn(
                    "transition-colors duration-200",
                    active ? "text-white" : "text-sand-400"
                  )}
                />
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

export function Nav() {
  const pathname = usePathname();

  // Force scroll to top on every route change — aggressive approach
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    // Immediate
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Delayed — catches post-paint browser restoration
    const t1 = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    });
    const t2 = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      document.documentElement.scrollTop = 0;
    }, 100);
    return () => { cancelAnimationFrame(t1); clearTimeout(t2); };
  }, [pathname]);

  return (
    <>
      <header className="bg-white border-b border-sand-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-sm text-sand-900">
              SponsorTrack
            </span>
          </Link>
          <DesktopTabs pathname={pathname} />
          <div className="flex items-center gap-1">
            <ActivityPanel />
            
          </div>
        </div>
      </header>
      <MobileBottomNav pathname={pathname} />
    </>
  );
}
