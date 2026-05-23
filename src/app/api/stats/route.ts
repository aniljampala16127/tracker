import { createClient } from "@supabase/supabase-js";
import { NextResponse, NextRequest } from "next/server";

// No force-dynamic — we want Vercel CDN caching for the public branch.
// Private (logged-in) branch still emits no-cache headers below.

const STEP_LABELS: Record<string, string> = {
  submitted: "Submitted", aor: "AOR", bil: "BIL",
  biometrics_given: "Bio Given", biometrics_done: "Bio Updated",
  sponsor_eligibility: "Sponsor Elig.",
  medical: "Medical Req", medicals_attended: "Med Attended", medical_passed: "Med Cleared",
  pa_eligibility: "PA Elig.", pre_arrival: "Pre-Arrival",
  background: "BG Complete", portal1: "Portal 1", portal2: "Portal 2", ecopr: "eCoPR",
  background_started: "BG Started", ppr: "PPR", passport_received: "Passport",
};

const STEP_ORDER = [
  "submitted","aor","bil","biometrics_given","biometrics_done","sponsor_eligibility",
  "medical","medicals_attended","medical_passed","pa_eligibility",
  "pre_arrival","background","portal1","portal2","ecopr",
];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getEntryStatus(stepEvents: any[]) {
  const completed = new Set(stepEvents.map((e: any) => e.step_id));
  if (completed.has("ecopr")) return "eCoPR ✓";
  for (let i = STEP_ORDER.length - 1; i >= 0; i--) {
    if (completed.has(STEP_ORDER[i]) && i < STEP_ORDER.length - 1) {
      return `Waiting for ${STEP_LABELS[STEP_ORDER[i + 1]] || STEP_ORDER[i + 1]}`;
    }
  }
  return "Submitted";
}

function formatEntry(a: any) {
  const events = a.step_events || [];
  const sub = events.find((e: any) => e.step_id === "submitted");
  const subDate = sub?.event_date || "";
  const now = new Date();
  const daysSince = sub ? Math.floor((now.getTime() - new Date(sub.event_date).getTime()) / 86400000) : 0;
  return {
    id: a.id,
    initials: a.initials,
    country: a.country_origin,
    stream: a.stream,
    sponsorStatus: a.sponsor_status,
    submittedDate: subDate,
    daysSince,
    status: getEntryStatus(events),
    stepsCompleted: events.length,
  };
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const myIds = searchParams.get("ids")?.split(",").filter(Boolean) || [];

  // Fetch only what we need — no comments, minimal fields
  const { data: apps, error } = await supabase
    .from("applications")
    .select("id, initials, country_origin, stream, sponsor_status, step_events(step_id, event_date, created_at)")
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

  // User's own entries (if IDs provided)
  const myEntries = myIds.length > 0
    ? all.filter(a => myIds.includes(a.id)).map(formatEntry)
    : [];

  // Same-week entries: 5 entries submitted within ±3 days of user's submission
  let sameWeekEntries: ReturnType<typeof formatEntry>[] = [];
  if (myEntries.length > 0 && myEntries[0].submittedDate) {
    const mySubDate = new Date(myEntries[0].submittedDate).getTime();
    const THREE_DAYS = 3 * 86400000;
    sameWeekEntries = all
      .filter(a => {
        if (myIds.includes(a.id)) return false; // exclude self
        const sub = (a.step_events || []).find((e: any) => e.step_id === "submitted");
        if (!sub) return false;
        const diff = Math.abs(new Date(sub.event_date).getTime() - mySubDate);
        return diff <= THREE_DAYS;
      })
      .slice(0, 5)
      .map(formatEntry);
    // If fewer than 5, widen to ±7 days
    if (sameWeekEntries.length < 5) {
      const SEVEN_DAYS = 7 * 86400000;
      sameWeekEntries = all
        .filter(a => {
          if (myIds.includes(a.id)) return false;
          const sub = (a.step_events || []).find((e: any) => e.step_id === "submitted");
          if (!sub) return false;
          const diff = Math.abs(new Date(sub.event_date).getTime() - mySubDate);
          return diff <= SEVEN_DAYS;
        })
        .slice(0, 5)
        .map(formatEntry);
    }
  }

  // Latest 5 entries (fallback for guests)
  const latestEntries = all.slice(0, 5).map(formatEntry);

  return NextResponse.json({
    totalEntries,
    totalCountries,
    totalWithAor,
    avgAor,
    milestones: milestones.slice(0, 6),
    latestEntries,
    myEntries,
    sameWeekEntries,
  }, {
    headers: {
      "Cache-Control": myIds.length > 0
        ? "private, s-maxage=0, max-age=30"
        : "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
