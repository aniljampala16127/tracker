import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("applications")
    .select("*, step_events(*), comments(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Strip future-dated step events (bad data)
  const today = new Date().toISOString().split("T")[0];
  const cleaned = (data || []).map(app => ({
    ...app,
    province: app.province === "Quebec" ? "Quebec" : "Outside Quebec",
    step_events: (app.step_events || []).filter((e: { event_date: string }) => e.event_date <= today),
    // Hide name for anonymous users (keep initials as "Anonymous")
    initials: app.is_anonymous ? "Anonymous" : app.initials,
    _real_initials: app.initials, // kept for owner-only display
    comments: (app.comments || []).sort((a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at)),
  }));

  return NextResponse.json(cleaned, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { initials, sponsor_status, stream, country_origin, subcategory, province, submitted_date, notes, pin_hash } = body;

  if (!initials || !sponsor_status || !stream || !country_origin || !submitted_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Block future dates
  const today = new Date().toISOString().split("T")[0];
  if (submitted_date > today) {
    return NextResponse.json({ error: "Submission date cannot be in the future" }, { status: 400 });
  }

  if (!pin_hash) {
    return NextResponse.json({ error: "PIN is required" }, { status: 400 });
  }

  // Ensure PIN is unique across all entries
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("pin_hash", pin_hash)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "PIN already in use. Please try again.", pin_exists: true }, { status: 409 });
  }

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
    })
    .select()
    .single();

  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });

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

  // Verify PIN
  const { data: app } = await supabase
    .from("applications")
    .select("pin_hash")
    .eq("id", id)
    .single();

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  // CLAIM: set PIN on unclaimed entry (no existing PIN)
  if (claim_pin_hash) {
    if (app.pin_hash) {
      return NextResponse.json({ error: "This entry already has a PIN" }, { status: 409 });
    }
    // Ensure PIN is unique
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

  // Only allow safe fields
  const allowed = ["initials", "sponsor_status", "stream", "country_origin", "province", "subcategory", "notes", "mei_type", "visa_country", "emoji", "is_anonymous"];
  const safeUpdates: Record<string, string | null> = {};
  for (const key of allowed) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  if (Object.keys(safeUpdates).length > 0) {
    const { error } = await supabase.from("applications").update(safeUpdates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update submission date if provided
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
