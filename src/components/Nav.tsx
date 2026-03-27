"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlaneIcon, BarChartIcon, ClockIcon, UsersIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ActivityPanel } from "@/components/ActivityFeed";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tracker", icon: PlaneIcon },
  { href: "/stats", label: "Stats", icon: BarChartIcon },
  { href: "/calculator", label: "Estimator", icon: ClockIcon },
  { href: "/compare", label: "Compare", icon: UsersIcon },
];

function MeIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const BOTTOM_NAV = [
  { href: "/dashboard", label: "Tracker", icon: PlaneIcon },
  { href: "/stats", label: "Stats", icon: BarChartIcon },
  { href: "/calculator", label: "Estimator", icon: ClockIcon },
  { href: "/me", label: "Me", icon: MeIcon },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Top header */}
      <header className="bg-white dark:bg-[#0F0F0E] border-b border-sand-200 dark:border-[#2A2A27] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-sm text-sand-900 dark:text-sand-100">
              SponsorTrack
            </span>
          </Link>

          {/* Desktop tabs */}
          <nav className="hidden sm:flex items-center gap-0.5 bg-sand-50 dark:bg-[#1A1A18] rounded-lg p-0.5 border border-sand-200 dark:border-[#2A2A27]">
            {[...NAV_ITEMS, { href: "/me", label: "Me", icon: MeIcon }].map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all",
                    active
                      ? "bg-brand-500 text-white"
                      : "text-sand-500 hover:text-sand-800 dark:hover:text-sand-200"
                  )}
                >
                  <item.icon size={13} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <ActivityPanel />
            <DarkModeToggle />
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0F0F0E]/90 backdrop-blur-xl border-t border-sand-200 dark:border-[#2A2A27] safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {BOTTOM_NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px]"
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                  active ? "bg-brand-500" : ""
                )}>
                  <item.icon size={16} className={active ? "text-white" : "text-sand-400 dark:text-sand-500"} />
                </div>
                <span className={cn(
                  "text-[9px] font-semibold",
                  active ? "text-brand-600 dark:text-brand-400" : "text-sand-400 dark:text-sand-600"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
