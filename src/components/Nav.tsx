"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlaneIcon, UsersIcon, BarChartIcon, ChatIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tracker", icon: PlaneIcon },
  { href: "/community", label: "Community", icon: UsersIcon },
  { href: "/discussions", label: "Chat", icon: ChatIcon },
  { href: "/stats", label: "Stats", icon: BarChartIcon },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-sand-200 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-brand-500">
          <PlaneIcon size={22} />
          <span className="font-bold text-base text-sand-900 hidden sm:inline">
            SponsorTrack
          </span>
        </Link>

        <nav className="flex items-center gap-1 bg-sand-50 rounded-lg p-0.5 border border-sand-200">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  active
                    ? "bg-brand-500 text-white"
                    : "text-sand-500 hover:text-sand-800"
                )}
              >
                <item.icon size={14} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Placeholder right side — could add theme toggle later */}
        <div className="w-16" />
      </div>
    </header>
  );
}
