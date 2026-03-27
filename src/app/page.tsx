"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";
import { getSavedPinHash } from "@/lib/pin";
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

export default function LandingPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .order("created_at", { ascending: true });
    if (data) {
      const all = data as Application[];
      setApps(all);
      // Smart return: if user has a claimed entry, redirect to /me
      if (!checked) {
        const hasEntry = all.some(a => a.pin_hash && getSavedPinHash(a.id) === a.pin_hash);
        if (hasEntry) { router.replace("/me"); return; }
        setChecked(true);
      }
    }
    setLoading(false);
  }, [supabase, checked, router]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const totalEntries = apps.length;
  const totalCountries = new Set(apps.map(a => a.country_origin)).size;
  const totalWithAor = apps.filter(a => a.step_events?.some(e => e.step_id === "aor")).length;

  const aorDays: number[] = [];
  apps.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (s.submitted && s.aor) aorDays.push(daysBetween(s.submitted, s.aor));
  });
  const avgAor = aorDays.length ? Math.round(aorDays.reduce((a, b) => a + b, 0) / aorDays.length) : 0;

  // Recent milestones (7 days)
  const recentMilestones: { initials: string; step: string; timeAgo: string }[] = [];
  const now = Date.now();
  apps.forEach(a => {
    (a.step_events || []).forEach(e => {
      if (e.step_id === "submitted") return;
      const diff = now - new Date(e.created_at).getTime();
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        recentMilestones.push({
          initials: a.initials,
          step: STEPS.find(s => s.id === e.step_id)?.label || e.step_id,
          timeAgo: days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : "just now",
        });
      }
    });
  });
  recentMilestones.sort((a, b) => {
    const parse = (s: string) => { const n = parseInt(s); return s.includes("d") ? n * 24 : s.includes("h") ? n : 0; };
    return parse(a.timeAgo) - parse(b.timeAgo);
  });

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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/dashboard" className="w-full sm:w-auto px-6 py-3 bg-brand-500 text-white font-semibold text-sm rounded-xl hover:bg-brand-600 transition-all active:scale-[0.98] shadow-lg shadow-brand-500/20">
                Add Your Application
              </Link>
              <Link href="/stats" className="w-full sm:w-auto px-6 py-3 bg-white text-sand-700 font-medium text-sm rounded-xl border border-sand-200 hover:bg-sand-50 transition-all active:scale-[0.98]">
                View Analytics
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
