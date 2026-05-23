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
        {/* ─── Welcome band ─────────────────────────── */}
        <section className="hero-glow">
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-6">
            {myEntry ? (
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/25">
                  {myEntry.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em] mb-0.5">Welcome back</p>
                  <h1 className="text-2xl font-bold text-sand-900 tracking-tight leading-tight">
                    {myEntry.initials}
                  </h1>
                  <p className="text-[12px] text-sand-500 truncate">
                    {myEntry.country} · {myEntry.stream} · {myEntry.sponsorStatus}
                  </p>
                </div>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-sand-900 mb-5 tracking-tight">Welcome back</h1>
            )}

            {/* My status card — bigger, more confident */}
            {myEntry && (
              <Link
                href="/me"
                className="block bg-white border border-sand-200 rounded-2xl p-5 mb-4 hover:border-brand-300 hover:shadow-[0_4px_12px_rgba(26,26,24,0.06)] transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">Your application</span>
                  <span className="text-[11px] text-brand-600 font-semibold">View details <span aria-hidden>→</span></span>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-sand-900 mb-0.5 truncate">{myEntry.status}</p>
                    <p className="text-[12px] text-sand-500 nums-tabular">
                      Submitted {myEntry.submittedDate} · Day {myEntry.daysSince}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-3xl font-bold text-brand-600 leading-none nums-tabular">{myEntry.stepsCompleted}</p>
                    <p className="text-[10px] text-sand-400 font-medium mt-1 uppercase tracking-wider">steps done</p>
                  </div>
                </div>
              </Link>
            )}

            {/* Quick nav — bigger tiles, brand-tinted icons */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { href: "/me", label: "My app", icon: "M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21M16 7A4 4 0 11 8 7 4 4 0 0116 7" },
                { href: "/dashboard", label: "Tracker", icon: "M9 12L11 14L15 10M3 3H21V21H3Z" },
                { href: "/stats", label: "Stats", icon: "M18 20V10M12 20V4M6 20V14" },
                { href: "/calculator", label: "Estimator", icon: "M12 6V12L16 14M12 22C17.5 22 22 17.5 22 12S17.5 2 12 2S2 6.5 2 12S6.5 22 12 22Z" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-2 py-3.5 rounded-xl bg-white border border-sand-200 hover:border-brand-300 hover:bg-brand-50/40 transition-all active:scale-[0.97]"
                >
                  <span className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                  </span>
                  <span className="text-[11px] font-semibold text-sand-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Live stats strip ────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 mb-5">
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-sand-100">
              {[
                { label: "Total", value: totalEntries, suffix: "" },
                { label: "Countries", value: totalCountries, suffix: "" },
                { label: "Avg AOR", value: avgAor, suffix: "d" },
                { label: "Got AOR", value: totalWithAor, suffix: "" },
              ].map((s) => (
                <div key={s.label} className="py-3 px-2 text-center">
                  <div className="text-[9px] text-sand-500 font-bold uppercase tracking-[0.08em] mb-0.5">{s.label}</div>
                  <div className="text-xl font-bold text-sand-900 nums-tabular leading-none">
                    {s.value}{s.suffix || ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Your entry + same-week cohort ───────── */}
        <section className="max-w-5xl mx-auto px-4 mb-5">
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            {/* YOUR ENTRY — highlighted on top */}
            {myEntry && (
              <Link
                href="/me"
                className="flex items-center gap-3 px-4 py-3.5 bg-brand-500/5 border-l-[3px] border-brand-500 hover:bg-brand-500/10 transition-colors active:bg-brand-500/15"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-[12px] font-bold text-white">{myEntry.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[13px] font-bold text-sand-900">{myEntry.initials}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500 text-white tracking-wider">YOU</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      myEntry.stream === "Inland" ? "bg-brand-100 text-brand-700" : "bg-warn/15 text-warn-dark"
                    }`}>{myEntry.stream}</span>
                  </div>
                  <p className="text-[11px] text-sand-500 truncate nums-tabular">{myEntry.country} · {myEntry.sponsorStatus} · Sub {myEntry.submittedDate}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] font-bold text-brand-600 leading-tight">{myEntry.status.replace("Waiting for ", "")}</p>
                  <p className="text-[10px] text-sand-400 nums-tabular">Day {myEntry.daysSince}</p>
                </div>
              </Link>
            )}

            {/* Same-week entries header */}
            {sameWeekEntries.length > 0 && (
              <div className="px-4 py-2 bg-sand-50 border-y border-sand-100 flex items-center justify-between">
                <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">Submitted same week</p>
                <Link href="/dashboard" className="text-[10px] text-brand-600 font-semibold">See all <span aria-hidden>→</span></Link>
              </div>
            )}

            {/* Same-week entries */}
            <div className="row-divide">
              {sameWeekEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href="/dashboard"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-sand-50 transition-colors active:bg-sand-100"
                >
                  <div className="w-9 h-9 rounded-lg bg-sand-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-sand-600">{entry.initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[12px] font-bold text-sand-900 truncate">{entry.initials}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        entry.stream === "Inland" ? "bg-brand-100 text-brand-700" : "bg-warn/15 text-warn-dark"
                      }`}>{entry.stream}</span>
                    </div>
                    <p className="text-[11px] text-sand-500 truncate nums-tabular">{entry.country} · {entry.sponsorStatus} · Sub {entry.submittedDate}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] font-semibold text-brand-600 leading-tight">{entry.status.replace("Waiting for ", "")}</p>
                    <p className="text-[10px] text-sand-400 nums-tabular">Day {entry.daysSince}</p>
                  </div>
                </Link>
              ))}
            </div>

            {sameWeekEntries.length === 0 && !loading && (
              <div className="px-4 py-8 text-center">
                <p className="text-[12px] text-sand-500">No other entries submitted the same week</p>
                <Link href="/dashboard" className="text-[12px] text-brand-600 font-semibold mt-2 inline-block">Browse all entries <span aria-hidden>→</span></Link>
              </div>
            )}
          </div>
        </section>

        {/* ─── Recent milestones ───────────────────── */}
        {recentMilestones.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-sand-900">Recent milestones</h2>
              <Link href="/dashboard" className="text-[11px] text-brand-600 font-semibold">See all <span aria-hidden>→</span></Link>
            </div>
            <div className="bg-white border border-sand-200 rounded-xl overflow-hidden">
              <div className="row-divide">
                {recentMilestones.slice(0, 4).map((m, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-sand-50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12" /></svg>
                    </div>
                    <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                      <span className="font-bold text-sand-900">{m.initials}</span>
                      <span className="text-sand-400 text-[11px]">reached</span>
                      <span className="font-bold text-brand-600">{m.step}</span>
                    </div>
                    <span className="text-sand-400 text-[10px] nums-tabular flex-shrink-0">{m.timeAgo}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="max-w-5xl mx-auto px-4 pb-6">
          <div className="text-center text-[11px] text-sand-400 leading-relaxed">
            <p>SponsorTrack · Not affiliated with IRCC or the Government of Canada.</p>
          </div>
        </section>
      </div>
    );
  }

  // =============================================
  // GUEST VIEW — landing page
  // =============================================
  return (
    <div className="-mx-4 -mt-6">
      {/* ─── Hero ──────────────────────────────────────── */}
      <section className="hero-glow">
        <div className="max-w-5xl mx-auto px-4 pt-14 sm:pt-20 pb-12 sm:pb-16">
          <div className="text-center max-w-2xl mx-auto">
            {/* Live pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-sand-200 shadow-[0_1px_2px_rgba(26,26,24,0.04)] text-[11px] font-semibold text-sand-700 mb-6">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
              </span>
              <span className="nums-tabular">{loading ? "—" : totalEntries}</span>
              <span className="text-sand-500">applications tracking live</span>
            </div>

            {/* Headline */}
            <h1 className="text-[34px] leading-[1.05] sm:text-[52px] sm:leading-[1.02] font-bold text-sand-900 tracking-tight mb-4">
              Track your Canada
              <br />
              <span className="text-brand-600">spousal sponsorship.</span>
            </h1>
            <p className="text-[15px] sm:text-base text-sand-600 leading-relaxed max-w-md mx-auto mb-8">
              Real processing times from the community. Know where you stand.
              Get predicted dates for every step.
            </p>

            {/* CTAs */}
            <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
              <Link
                href="/dashboard"
                className="w-full px-6 py-3.5 bg-brand-500 text-white font-semibold text-[15px] rounded-xl hover:bg-brand-600 transition-all active:scale-[0.98] shadow-lg shadow-brand-500/25 text-center"
              >
                Add your application
              </Link>

              {/* PIN reconnect card — calmer, less competitive with primary CTA */}
              <div className="w-full bg-white border border-sand-200 rounded-xl p-3 shadow-[0_1px_2px_rgba(26,26,24,0.03)]">
                <p className="text-[11px] font-semibold text-sand-500 uppercase tracking-[0.06em] text-center mb-2">
                  Already tracking? Enter your PIN
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={claimPin}
                    onChange={(e) => { setClaimPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setClaimError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && claimPin.length === 4) handleClaim(); }}
                    className={`flex-1 px-3 py-2.5 text-base text-center rounded-lg border bg-sand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 tracking-[0.45em] font-mono font-semibold transition-colors ${
                      claimError ? "border-error shake" : "border-sand-200"
                    }`}
                  />
                  <button
                    onClick={handleClaim}
                    disabled={claimPin.length !== 4 || claiming}
                    className="px-4 py-2.5 bg-sand-900 text-sand-50 text-sm font-semibold rounded-lg hover:bg-sand-800 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {claiming ? "…" : "Reconnect"}
                  </button>
                </div>
                {claimError && <p className="text-[11px] text-error mt-1.5 text-center font-medium">{claimError}</p>}
              </div>

              <Link
                href="/stats"
                className="inline-flex items-center gap-1 px-3 py-2 text-sand-500 font-medium text-[13px] hover:text-brand-600 transition-colors"
              >
                View analytics
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Live stat strip ─────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 mb-12 sm:mb-16">
        <div className="bg-white border border-sand-200 rounded-2xl shadow-[0_1px_2px_rgba(26,26,24,0.04)] overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-sand-100">
            {[
              { label: "Applications", value: totalEntries, suffix: "" },
              { label: "Countries", value: totalCountries, suffix: "" },
              { label: "Avg AOR", value: avgAor, suffix: "d" },
              { label: "Got AOR", value: totalWithAor, suffix: "" },
            ].map((stat) => (
              <div key={stat.label} className="p-5 text-center sm:text-left">
                <div className="text-[10px] text-sand-500 font-bold uppercase tracking-[0.08em] mb-1.5">
                  {stat.label}
                </div>
                <div className="text-3xl sm:text-[32px] font-bold text-sand-900 leading-none nums-tabular">
                  {loading ? <span className="text-sand-300">—</span> : <CountUp target={stat.value} suffix={stat.suffix} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ──────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 mb-12 sm:mb-16">
        <div className="text-center max-w-md mx-auto mb-8">
          <p className="text-[10px] text-sand-500 font-bold uppercase tracking-[0.08em] mb-2">In 3 steps</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-sand-900 tracking-tight">How it works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: "01", title: "Add your application", desc: "Initials, country, stream, submission date. Protected by a 4-digit PIN — no sign-up.", accent: "bg-brand-500" },
            { step: "02", title: "Track each step", desc: "Update AOR, BIL, Medical, Background, Portal as IRCC processes you. See how long each stage takes.", accent: "bg-warn" },
            { step: "03", title: "See where you stand", desc: "Queue position, processing trends, and an estimated date for every remaining step.", accent: "bg-brand-700" },
          ].map((item) => (
            <div
              key={item.step}
              className="group relative bg-white border border-sand-200 rounded-xl p-5 hover:border-brand-300 hover:shadow-[0_4px_12px_rgba(26,26,24,0.06)] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <span className={`inline-flex items-center justify-center px-2.5 py-1 ${item.accent} text-white font-bold text-[11px] rounded-md tracking-wider nums-tabular`}>
                  {item.step}
                </span>
              </div>
              <h3 className="text-[15px] font-bold text-sand-900 mb-1.5">{item.title}</h3>
              <p className="text-[13px] text-sand-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Recent milestones ──────────────────────── */}
      {recentMilestones.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 mb-12 sm:mb-16">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-sand-900">Recent milestones</h2>
            <Link href="/dashboard" className="text-xs text-brand-600 font-semibold hover:text-brand-700">
              See all <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="bg-white border border-sand-200 rounded-xl overflow-hidden">
            <div className="row-divide">
              {recentMilestones.slice(0, 6).map((m, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-sand-50 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12" /></svg>
                  </div>
                  <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                    <span className="font-bold text-sand-900">{m.initials}</span>
                    <span className="text-sand-400 text-xs">reached</span>
                    <span className="font-bold text-brand-600">{m.step}</span>
                  </div>
                  <span className="text-[11px] text-sand-400 nums-tabular flex-shrink-0">{m.timeAgo}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Features grid ──────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 mb-12 sm:mb-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { title: "Completion estimator", desc: "Predicted dates for every step", icon: "M12 6V12L16 14" },
            { title: "Compare timelines", desc: "Side-by-side with others", icon: "M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21" },
            { title: "Processing trends", desc: "Is IRCC getting faster?", icon: "M18 20V10M12 20V4M6 20V14" },
            { title: "PIN protected", desc: "Only you can edit your entry", icon: "M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" },
          ].map((f) => (
            <div
              key={f.title}
              className="group bg-white border border-sand-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-[0_4px_12px_rgba(26,26,24,0.06)] transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
              </div>
              <h3 className="text-[13px] font-bold text-sand-900 mb-1 leading-tight">{f.title}</h3>
              <p className="text-[11px] text-sand-500 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bottom CTA ─────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 mb-10">
        <div className="tile-brand rounded-2xl p-8 sm:p-10 text-center shadow-lg shadow-brand-500/15 overflow-hidden relative">
          <p className="text-[10px] text-white/70 font-bold uppercase tracking-[0.08em] mb-2">Free forever · No sign-up</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            Join <span className="nums-tabular">{totalEntries}</span>+ applicants
          </h2>
          <p className="text-sm text-white/75 mb-6 max-w-sm mx-auto">
            Add your application in 30 seconds and start tracking with the community.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-white text-brand-700 font-semibold text-[14px] rounded-xl hover:bg-sand-50 transition-all active:scale-[0.98] shadow-md"
          >
            Add your application
          </Link>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-10">
        <div className="text-center text-[11px] text-sand-400 space-y-1 leading-relaxed">
          <p>SponsorTrack · Not affiliated with IRCC or the Government of Canada.</p>
          <p>All data is community-reported. No personal information is collected.</p>
        </div>
      </section>
    </div>
  );
}
