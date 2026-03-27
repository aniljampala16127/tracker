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

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Top header */}
      <header className="bg-white border-b border-sand-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-brand-500">
            <PlaneIcon size={22} />
            <span className="font-bold text-base text-sand-900">
              SponsorTrack
            </span>
          </Link>

          {/* Desktop tabs — hidden on mobile */}
          <nav className="hidden sm:flex items-center gap-0.5 bg-sand-50 rounded-lg p-0.5 border border-sand-200">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all",
                    active
                      ? "bg-brand-500 text-white"
                      : "text-sand-500 hover:text-sand-800"
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

      {/* Mobile bottom nav — hidden on desktop */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-sand-200 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[60px] transition-all",
                  active
                    ? "text-brand-600"
                    : "text-sand-400"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                  active ? "bg-brand-100" : ""
                )}>
                  <item.icon size={18} className={active ? "text-brand-600" : "text-sand-400"} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  active ? "text-brand-700" : "text-sand-400"
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
