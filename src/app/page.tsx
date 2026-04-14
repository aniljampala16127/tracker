"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { hashPin, savePinForApp } from "@/lib/pin";
import Link from "next/link";

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const duration = 1200;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count}{suffix}</>;
}

interface EntryInfo {
  id: string;
  initials: string;
  country: string;
  stream: string;
  sponsorStatus: string;
  submittedDate: string;
  daysSince: number;
  status: string;
  stepsCompleted: number;
}

interface Stats {
  totalEntries: number;
  totalCountries: number;
  totalWithAor: number;
  avgAor: number;
  milestones: { initials: string; step: string; timeAgo: string }[];
  latestEntries: EntryInfo[];
  myEntries: EntryInfo[];
  sameWeekEntries: EntryInfo[];
}

export default function LandingPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [claimPin, setClaimPin] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const router = useRouter();

  // Check localStorage for saved pins (no redirect)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sponsortrack-pins");
      if (raw) {
        const pins = JSON.parse(raw);
        const ids = Object.keys(pins);
        if (ids.length > 0) {
          setIsLoggedIn(true);
          setSavedIds(ids);
        }
      }
    } catch { /* not logged in */ }
  }, []);

  // Fetch stats — include user's IDs if logged in
  const fetchStats = useCallback(async () => {
    const url = savedIds.length > 0
      ? `/api/stats?ids=${savedIds.join(",")}`
      : `/api/stats`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.totalEntries != null) setStats(data);
    setLoading(false);
  }, [savedIds]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // PIN claim via server-side /api/reconnect
  const handleClaim = async () => {
    if (claimPin.length !== 4) return;
    setClaiming(true);
    setClaimError("");
    const pinHash = await hashPin(claimPin);
    const res = await fetch("/api/reconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin_hash: pinHash }),
    });
    const data = await res.json();
    if (!res.ok || !data.matched?.length) {
      setClaimError("No entries found with this PIN");
      setClaiming(false);
      return;
    }
    data.matched.forEach((id: string) => savePinForApp(id, pinHash));
    setClaiming(false);
    router.replace("/me");
  };

  const totalEntries = stats?.totalEntries || 0;
  const totalCountries = stats?.totalCountries || 0;
  const totalWithAor = stats?.totalWithAor || 0;
  const avgAor = stats?.avgAor || 0;
  const recentMilestones = stats?.milestones || [];
  const latestEntries = stats?.latestEntries || [];
  const myEntries = stats?.myEntries || [];
  const sameWeekEntries = stats?.sameWeekEntries || [];
  const myEntry = myEntries[0];

  // =============================================
  // LOGGED-IN VIEW — personalized landing
  // =============================================
  if (isLoggedIn && !loading) {
    return (
      <div className="-mx-4 -mt-6">
        {/* Welcome header */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-warn/5" />
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-6 relative">
            {myEntry ? (
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/20">
                  {myEntry.initials}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-sand-900">Welcome back, {myEntry.initials}</h1>
                  <p className="text-xs text-sand-500">{myEntry.country} · {myEntry.stream} · {myEntry.sponsorStatus}</p>
                </div>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-sand-900 mb-4">Welcome back</h1>
            )}

            {/* My status card */}
            {myEntry && (
              <Link href="/me" className="block bg-white border border-sand-200 rounded-xl p-4 mb-3 hover:border-brand-300 transition-colors active:scale-[0.99]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-sand-400 uppercase tracking-wider">Your Application</span>
                  <span className="text-[10px] text-brand-600 font-semibold">View details →</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-sand-900">{myEntry.status}</p>
                    <p className="text-[11px] text-sand-500">Submitted {myEntry.submittedDate} · Day {myEntry.daysSince}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-brand-600">{myEntry.stepsCompleted}</p>
                    <p className="text-[9px] text-sand-400">steps done</p>
                  </div>
                </div>
              </Link>
            )}

            {/* Quick nav */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { href: "/me", label: "My App", icon: "M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" },
                { href: "/dashboard", label: "Tracker", icon: "M9 12L11 14L15 10M3 3H21V21H3Z" },
                { href: "/stats", label: "Stats", icon: "M18 20V10M12 20V4M6 20V14" },
                { href: "/calculator", label: "Estimator", icon: "M12 6V12L16 14M12 22C17.5 22 22 17.5 22 12S17.5 2 12 2S2 6.5 2 12S6.5 22 12 22Z" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border border-sand-200 hover:bg-sand-50 transition-colors active:scale-[0.97]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                  <span className="text-[10px] font-semibold text-sand-600">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Live stats strip */}
        <section className="max-w-5xl mx-auto px-4 mb-4">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Total", value: totalEntries },
              { label: "Countries", value: totalCountries },
              { label: "Avg AOR", value: avgAor, suffix: "d" },
              { label: "Got AOR", value: totalWithAor },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-sand-200 rounded-xl py-2.5 text-center">
                <div className="text-lg font-bold text-sand-900">{s.value}{s.suffix || ""}</div>
                <div className="text-[9px] text-sand-400 font-medium uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Your entry + same-week cohort */}
        <section className="max-w-5xl mx-auto px-4 mb-4">
          <div className="bg-white border border-sand-200 rounded-xl overflow-hidden">
            {/* YOUR ENTRY — highlighted on top */}
            {myEntry && (
              <Link
                href="/me"
                className="flex items-center gap-3 px-4 py-3 bg-brand-500/5 border-b-2 border-brand-200 hover:bg-brand-500/10 transition-colors active:bg-brand-500/15"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">{myEntry.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-sand-900">{myEntry.initials}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">YOU</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      myEntry.stream === "Inland" ? "bg-brand-100 text-brand-700" : "bg-warn/10 text-warn"
                    }`}>{myEntry.stream}</span>
                  </div>
                  <p className="text-[10px] text-sand-500 truncate">{myEntry.country} · {myEntry.sponsorStatus} · Sub {myEntry.submittedDate}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-bold text-brand-600 leading-tight">{myEntry.status.replace("Waiting for ", "")}</p>
                  <p className="text-[9px] text-sand-400">Day {myEntry.daysSince}</p>
                </div>
              </Link>
            )}

            {/* Same-week entries header */}
            {sameWeekEntries.length > 0 && (
              <div className="px-4 py-2 bg-sand-50 border-b border-sand-100">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider">Submitted same week</p>
                  <Link href="/dashboard" className="text-[10px] text-brand-600 font-semibold">See all →</Link>
                </div>
              </div>
            )}

            {/* Same-week entries */}
            {sameWeekEntries.map((entry, i) => (
              <Link
                key={entry.id}
                href="/dashboard"
                className={`flex items-center gap-3 px-4 py-3 hover:bg-sand-50 transition-colors active:bg-sand-100 ${
                  i < sameWeekEntries.length - 1 ? "border-b border-sand-100" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-sand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-sand-600">{entry.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-sand-900 truncate">{entry.initials}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      entry.stream === "Inland" ? "bg-brand-100 text-brand-700" : "bg-warn/10 text-warn"
                    }`}>{entry.stream}</span>
                  </div>
                  <p className="text-[10px] text-sand-500 truncate">{entry.country} · {entry.sponsorStatus} · Sub {entry.submittedDate}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-semibold text-brand-600 leading-tight">{entry.status.replace("Waiting for ", "")}</p>
                  <p className="text-[9px] text-sand-400">Day {entry.daysSince}</p>
                </div>
              </Link>
            ))}

            {sameWeekEntries.length === 0 && !loading && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-sand-400">No other entries submitted the same week</p>
                <Link href="/dashboard" className="text-[11px] text-brand-600 font-semibold mt-1 inline-block">Browse all entries →</Link>
              </div>
            )}
          </div>
        </section>

        {/* Recent milestones */}
        {recentMilestones.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 mb-4">
            <h2 className="text-sm font-bold text-sand-900 mb-2">Recent milestones</h2>
            <div className="bg-white border border-sand-200 rounded-xl p-3 space-y-1.5">
              {recentMilestones.slice(0, 4).map((m, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12" /></svg>
                  </div>
                  <span className="text-sand-700">
                    <span className="font-semibold">{m.initials}</span>
                    <span className="text-sand-400"> → </span>
                    <span className="font-semibold text-brand-600">{m.step}</span>
                  </span>
                  <span className="text-sand-400 ml-auto text-[10px]">{m.timeAgo}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="max-w-5xl mx-auto px-4 pb-6">
          <div className="text-center text-[10px] text-sand-400 space-y-1">
            <p>SponsorTrack is a free community tool. Not affiliated with IRCC or the Government of Canada.</p>
          </div>
        </section>
      </div>
    );
  }

  // =============================================
  // GUEST VIEW — current landing page (unchanged)
  // =============================================
  return (
    <div className="-mx-4 -mt-6">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-warn/5" />
        <div className="max-w-5xl mx-auto px-4 pt-12 pb-10 relative">
          <div className="text-center max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-[11px] font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              {loading ? "..." : totalEntries} applications tracking live
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-sand-900 mb-3 leading-tight tracking-tight">
              Track your Canada<br />
              <span className="text-brand-600">spousal sponsorship</span>
            </h1>
            <p className="text-sm text-sand-500 mb-6 leading-relaxed max-w-sm mx-auto">
              See real processing times from the community. Know where you stand. Get predicted dates for every step.
            </p>
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <Link href="/dashboard" className="w-full px-6 py-3 bg-brand-500 text-white font-semibold text-sm rounded-xl hover:bg-brand-600 transition-all active:scale-[0.98] shadow-lg shadow-brand-500/20 text-center">
                Add Your Application
              </Link>

              <div className="w-full px-4 py-3 bg-white border border-sand-200 rounded-xl">
                <p className="text-[11px] font-semibold text-sand-600 mb-2 text-center">Already tracking? Enter your PIN</p>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="PIN"
                    value={claimPin}
                    onChange={(e) => { setClaimPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setClaimError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && claimPin.length === 4) handleClaim(); }}
                    className="flex-1 px-3 py-2 text-sm text-center rounded-lg border border-sand-200 bg-sand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 tracking-[0.3em] font-mono"
                  />
                  <button
                    onClick={handleClaim}
                    disabled={claimPin.length !== 4 || claiming}
                    className="px-5 py-2 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {claiming ? "..." : "Reconnect"}
                  </button>
                </div>
                {claimError && <p className="text-[10px] text-error mt-1.5 text-center">{claimError}</p>}
              </div>

              <Link href="/stats" className="w-full px-6 py-3 text-sand-500 font-medium text-xs text-center hover:text-sand-800 transition-colors">
                View Analytics →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="max-w-5xl mx-auto px-4 -mt-2 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Applications", value: totalEntries, suffix: "", icon: "M9 12L11 14L15 10M3 3H21V21H3Z" },
            { label: "Countries", value: totalCountries, suffix: "", icon: "M12 22C17.5 22 22 17.5 22 12S17.5 2 12 2S2 6.5 2 12S6.5 22 12 22Z" },
            { label: "Avg AOR", value: avgAor, suffix: "d", icon: "M12 6V12L16 14M12 22C17.5 22 22 17.5 22 12S17.5 2 12 2S2 6.5 2 12S6.5 22 12 22Z" },
            { label: "Got AOR", value: totalWithAor, suffix: "", icon: "M20 6L9 17L4 12" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-sand-200 rounded-xl p-4 text-center">
              <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center mx-auto mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={stat.icon} /></svg>
              </div>
              <div className="text-2xl font-bold text-sand-900">
                {loading ? "—" : <CountUp target={stat.value} suffix={stat.suffix} />}
              </div>
              <div className="text-[10px] text-sand-400 font-medium uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 mb-8">
        <h2 className="text-lg font-bold text-sand-900 text-center mb-5">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Add your app", desc: "Enter initials, country, stream, and submission date. Protected by a 4-digit PIN.", color: "bg-brand-500" },
            { step: "2", title: "Track progress", desc: "Update each step as IRCC processes your application. See how long each stage takes.", color: "bg-warn" },
            { step: "3", title: "Get predictions", desc: "See where you stand vs the community, your queue position, and estimated completion dates.", color: "bg-brand-600" },
          ].map((item) => (
            <div key={item.step} className="bg-white border border-sand-200 rounded-xl p-5">
              <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center text-white font-bold text-sm mb-3`}>{item.step}</div>
              <h3 className="text-sm font-bold text-sand-900 mb-1">{item.title}</h3>
              <p className="text-xs text-sand-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live activity */}
      {recentMilestones.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 mb-8">
          <h2 className="text-lg font-bold text-sand-900 text-center mb-4">Recent milestones</h2>
          <div className="bg-white border border-sand-200 rounded-xl p-4 space-y-2">
            {recentMilestones.slice(0, 6).map((m, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12" /></svg>
                </div>
                <span className="text-sand-900">
                  <span className="font-semibold">{m.initials}</span>
                  <span className="text-sand-500"> reached </span>
                  <span className="font-semibold text-brand-600">{m.step}</span>
                </span>
                <span className="text-sand-400 ml-auto flex-shrink-0">{m.timeAgo}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features grid */}
      <section className="max-w-5xl mx-auto px-4 mb-8">
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: "Completion Estimator", desc: "Predicted dates for every step", icon: "M12 6V12L16 14" },
            { title: "Compare Timelines", desc: "Side-by-side with others", icon: "M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21" },
            { title: "Processing Trends", desc: "Is IRCC getting faster?", icon: "M18 20V10M12 20V4M6 20V14" },
            { title: "PIN Protected", desc: "Only you can edit your entry", icon: "M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" },
          ].map((f) => (
            <div key={f.title} className="bg-white border border-sand-200 rounded-xl p-4">
              <div className="w-7 h-7 rounded-lg bg-sand-100 flex items-center justify-center mb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#65635D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
              </div>
              <h3 className="text-xs font-bold text-sand-900 mb-0.5">{f.title}</h3>
              <p className="text-[10px] text-sand-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-5xl mx-auto px-4 mb-8">
        <div className="bg-brand-500 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-bold text-white mb-1">Join {totalEntries}+ applicants</h2>
          <p className="text-xs text-white/70 mb-4">Free forever. No sign-up. Takes 30 seconds.</p>
          <Link href="/dashboard" className="inline-block px-6 py-2.5 bg-white text-brand-600 font-semibold text-sm rounded-xl hover:bg-sand-50 transition-all active:scale-[0.98]">
            Add Your Application
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-8">
        <div className="text-center text-[10px] text-sand-400 space-y-1">
          <p>SponsorTrack is a free community tool. Not affiliated with IRCC or the Government of Canada.</p>
          <p>All data is community-reported. No personal information is collected.</p>
        </div>
      </section>
    </div>
  );
}
