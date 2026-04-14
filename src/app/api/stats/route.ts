import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STEP_LABELS: Record<string, string> = {
  aor: "AOR", bil: "BIL", sponsor_eligibility: "Sponsor Elig.",
  medical: "Medical", pa_eligibility: "PA Elig.", pre_arrival: "Pre-Arrival",
  background: "BG Complete", portal1: "Portal 1", portal2: "Portal 2", ecopr: "eCoPR",
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();

  // Fetch only what we need — no comments, minimal fields
  const { data: apps, error } = await supabase
    .from("applications")
    .select("id, initials, country_origin, stream, step_events(step_id, event_date, created_at)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = apps || [];
  const totalEntries = all.length;
  const totalCountries = new Set(all.map(a => a.country_origin)).size;
  const totalWithAor = all.filter(a => (a.step_events || []).some((e: any) => e.step_id === "aor")).length;

  // Avg AOR days
  const aorDays: number[] = [];
  all.forEach(a => {
    const sub = (a.step_events || []).find((e: any) => e.step_id === "submitted");
    const aor = (a.step_events || []).find((e: any) => e.step_id === "aor");
    if (sub && aor) {
      const d = Math.round((new Date(aor.event_date).getTime() - new Date(sub.event_date).getTime()) / 86400000);
      if (d >= 0 && d <= 200) aorDays.push(d);
    }
  });
  const avgAor = aorDays.length ? Math.round(aorDays.reduce((a, b) => a + b, 0) / aorDays.length) : 0;

  // Recent milestones (7 days)
  const now = Date.now();
  const milestones: { initials: string; step: string; timeAgo: string }[] = [];
  all.forEach(a => {
    (a.step_events || []).forEach((e: any) => {
      if (e.step_id === "submitted") return;
      const diff = now - new Date(e.created_at).getTime();
      if (diff < 7 * 86400000) {
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        milestones.push({
          initials: a.initials,
          step: STEP_LABELS[e.step_id] || e.step_id,
          timeAgo: days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : "just now",
        });
      }
    });
  });
  milestones.sort((a, b) => {
    const parse = (s: string) => { const n = parseInt(s); return s.includes("d") ? n * 24 : s.includes("h") ? n : 0; };
    return parse(a.timeAgo) - parse(b.timeAgo);
  });

  return NextResponse.json({
    totalEntries,
    totalCountries,
    totalWithAor,
    avgAor,
    milestones: milestones.slice(0, 6),
  }, {
    headers: {
      // Cache 5 minutes — stats barely change
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
