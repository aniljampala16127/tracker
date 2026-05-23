import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// NOTE: deliberately NOT setting `export const dynamic = "force-dynamic"`.
// We want the GET handler to be eligible for Vercel CDN caching via the
// Cache-Control header returned below. POST/PATCH/DELETE remain dynamic
// (they're inherently non-cacheable). force-dynamic on the whole route
// was costing us ~5 GB/month of needless Supabase egress on the free tier.

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ============================================
// Spam guards (in-memory — fast path; DB unique index is the real backstop)
// ============================================
const recentSubmits: Record<string, number> = {};
const ipSubmits: Record<string, { count: number; resetAt: number }> = {};

const DEDUP_WINDOW_MS = 10 * 60 * 1000;
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_MAX_SUBMITS = 5;

function isDuplicateSubmit(fingerprint: string): boolean {
  const now = Date.now();
  for (const k of Object.keys(recentSubmits)) {
    if (now - recentSubmits[k] > DEDUP_WINDOW_MS) delete recentSubmits[k];
  }
  const last = recentSubmits[fingerprint];
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  recentSubmits[fingerprint] = now;
  return false;
}

function isIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipSubmits[ip];
  if (!entry || now > entry.resetAt) {
    ipSubmits[ip] = { count: 1, resetAt: now + IP_WINDOW_MS };
    return false;
  }
  entry.count++;
  return entry.count > IP_MAX_SUBMITS;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Build the deterministic fingerprint used for dedup (both in-memory and DB)
function buildFingerprint(initials: string, country: string, stream: string, sponsorStatus: string, submittedDate: string): string {
  return [
    String(initials).trim().toLowerCase(),
    country,
    stream,
    sponsorStatus,
    submittedDate,
  ].join("|");
}

// Egress-tight column list. Anything the UI doesn't actually render is
// excluded — every saved byte multiplies over thousands of monthly fetches.
const APP_COLUMNS = [
  "id",
  "initials",
  "sponsor_status",
  "stream",
  "country_origin",
  "visa_country",
  "subcategory",
  "mei_type",
  "province",
  "current_step",
  "is_complete",
  "notes",
  "pin_hash",
  "emoji",
  "is_anonymous",
  "created_at",
].join(", ");

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("applications")
    .select(`
      ${APP_COLUMNS},
      step_events(step_id, event_date, created_at),
      comments(id, application_id, cohort_month, pin_hash, author_name, text, parent_id, created_at),
      spam_reports(reporter_pin_hash)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = new Date().toISOString().split("T")[0];
  const cleaned = (data || []).map(app => {
    const reports = (app.spam_reports || []) as { reporter_pin_hash: string }[];
    const reportCount = reports.length;
    const out: Record<string, unknown> = {
      ...app,
      province: app.province === "Quebec" ? "Quebec" : "Outside Quebec",
      step_events: (app.step_events || []).filter((e: { event_date: string }) => e.event_date <= today),
      initials: app.is_anonymous ? "Anonymous" : app.initials,
      _real_initials: app.initials,
      comments: (app.comments || []).sort((a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at)),
      spam_report_count: reportCount,
    };
    // Drop spam_reports payload and skip reporter_hashes array unless there
    // actually are reports — keeps the response tiny for the 99% of clean
    // entries and the response is gzip-friendly.
    delete out.spam_reports;
    if (reportCount > 0) {
      out.spam_reporter_hashes = reports.map(r => r.reporter_pin_hash);
    }
    return out;
  });

  return NextResponse.json(cleaned, {
    headers: {
      // 60s CDN cache + 5min SWR. Egress to Supabase drops ~80% under load
      // because most reads now come from Vercel's edge cache.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { initials, sponsor_status, stream, country_origin, subcategory, province, submitted_date, notes, pin_hash } = body;

  if (!initials || !sponsor_status || !stream || !country_origin || !submitted_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  if (submitted_date > today) {
    return NextResponse.json({ error: "Submission date cannot be in the future" }, { status: 400 });
  }

  if (!pin_hash) {
    return NextResponse.json({ error: "PIN is required" }, { status: 400 });
  }

  // --- Spam guard 1: IP rate limit ---
  const ip = getClientIp(request);
  if (isIpRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many submissions from this network. Try again in an hour." },
      { status: 429 }
    );
  }

  const fingerprint = buildFingerprint(initials, country_origin, stream, sponsor_status, submitted_date);

  // --- Spam guard 2: in-memory fingerprint dedup (fast path, best-effort) ---
  if (isDuplicateSubmit(fingerprint)) {
    return NextResponse.json(
      { error: "Looks like you just submitted this. Refresh and check — it should be there." },
      { status: 409 }
    );
  }

  // Ensure PIN is unique
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("pin_hash", pin_hash)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "PIN already in use. Please try again.", pin_exists: true }, { status: 409 });
  }

  // --- Insert with DB-level unique constraint as the real backstop ---
  const { data: app, error: appError } = await supabase
    .from("applications")
    .insert({
      initials: initials.trim().slice(0, 20),
      sponsor_status,
      stream,
      country_origin,
      subcategory: subcategory || null,
      province: province || "Outside Quebec",
      current_step: "submitted",
      notes: notes || null,
      pin_hash,
      submit_fingerprint: fingerprint,
    })
    .select()
    .single();

  if (appError) {
    // 23505 = Postgres unique_violation. Catch the fingerprint collision specifically.
    if (appError.code === "23505") {
      const msg = (appError.message || "").toLowerCase();
      if (msg.includes("submit_fingerprint") || msg.includes("idx_dedupe_fingerprint")) {
        return NextResponse.json(
          { error: "Looks like you just submitted this. Refresh and check — it should be there." },
          { status: 409 }
        );
      }
    }
    return NextResponse.json({ error: appError.message }, { status: 500 });
  }

  await supabase.from("step_events").insert({
    application_id: app.id,
    step_id: "submitted",
    event_date: submitted_date,
  });

  return NextResponse.json(app, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const pinHash = searchParams.get("pin_hash");

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const { data: app } = await supabase
    .from("applications")
    .select("pin_hash")
    .eq("id", id)
    .single();

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  if (app.pin_hash && app.pin_hash !== pinHash) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }

  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// PATCH — update application fields (PIN-protected)
export async function PATCH(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { id, pin_hash, claim_pin_hash, submitted_date, ...updates } = body;

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const { data: app } = await supabase
    .from("applications")
    .select("pin_hash")
    .eq("id", id)
    .single();

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  // CLAIM: set PIN on unclaimed entry
  if (claim_pin_hash) {
    if (app.pin_hash) {
      return NextResponse.json({ error: "This entry already has a PIN" }, { status: 409 });
    }
    const { data: dup } = await supabase.from("applications").select("id").eq("pin_hash", claim_pin_hash).limit(1);
    if (dup && dup.length > 0) {
      return NextResponse.json({ error: "PIN already in use. Please try again.", pin_exists: true }, { status: 409 });
    }
    const { error } = await supabase.from("applications").update({ pin_hash: claim_pin_hash }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, claimed: true });
  }

  if (app.pin_hash && app.pin_hash !== pin_hash) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }

  const allowed = ["initials", "sponsor_status", "stream", "country_origin", "province", "subcategory", "notes", "mei_type", "visa_country", "emoji", "is_anonymous"];
  const safeUpdates: Record<string, string | null> = {};
  for (const key of allowed) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  // If initials, country, stream, or sponsor_status changes, recompute the fingerprint
  // (keeps the DB constraint accurate after edits)
  const fingerprintFields = ["initials", "country_origin", "stream", "sponsor_status"];
  const willChangeFingerprint = fingerprintFields.some(f => f in updates) || !!submitted_date;
  if (willChangeFingerprint) {
    // Fetch current values to build the new fingerprint
    const { data: current } = await supabase
      .from("applications")
      .select("initials, country_origin, stream, sponsor_status, step_events(step_id, event_date)")
      .eq("id", id)
      .single();
    if (current) {
      const events = (current as { step_events?: { step_id: string; event_date: string }[] }).step_events || [];
      const currentSub = events.find(e => e.step_id === "submitted")?.event_date || "";
      const newFp = buildFingerprint(
        (safeUpdates.initials ?? current.initials) as string,
        (safeUpdates.country_origin ?? current.country_origin) as string,
        (safeUpdates.stream ?? current.stream) as string,
        (safeUpdates.sponsor_status ?? current.sponsor_status) as string,
        submitted_date || currentSub,
      );
      (safeUpdates as Record<string, string | null>).submit_fingerprint = newFp;
    }
  }

  if (Object.keys(safeUpdates).length > 0) {
    const { error } = await supabase.from("applications").update(safeUpdates).eq("id", id);
    if (error) {
      // If a user edits their entry to collide with another, return a friendly error
      if (error.code === "23505" && (error.message || "").toLowerCase().includes("fingerprint")) {
        return NextResponse.json({ error: "Those details already match another entry." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (submitted_date) {
    const today = new Date().toISOString().split("T")[0];
    if (submitted_date > today) {
      return NextResponse.json({ error: "Date cannot be in the future" }, { status: 400 });
    }
    const { error } = await supabase
      .from("step_events")
      .update({ event_date: submitted_date })
      .eq("application_id", id)
      .eq("step_id", "submitted");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}