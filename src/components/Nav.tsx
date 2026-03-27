"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlaneIcon, BarChartIcon, ClockIcon, UsersIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tracker", icon: PlaneIcon },
  { href: "/stats", label: "Stats", icon: BarChartIcon },
  { href: "/calculator", label: "Estimator", icon: ClockIcon },
  { href: "/compare", label: "Compare", icon: UsersIcon },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-sand-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-brand-500">
          <PlaneIcon size={22} />
          <span className="font-bold text-base text-sand-900 hidden sm:inline">
            SponsorTrack
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 bg-sand-50 rounded-lg p-0.5 border border-sand-200">
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
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="w-8" />
      </div>
    </header>
  );
}
