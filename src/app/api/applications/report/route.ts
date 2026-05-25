import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DELETE_THRESHOLD = 2; // 2+ unique reporters → auto-delete

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

/**
 * POST /api/applications/report
 *
 * Body: { application_id: string, reporter_pin_hash: string, reason?: string }
 *
 * Records a spam report from the given user against the given app. When the
 * count of distinct reporters reaches DELETE_THRESHOLD, the application is
 * auto-deleted (cascades to step_events, comments, reactions, and the spam
 * reports themselves).
 *
 * Anti-abuse:
 *  - unique(application_id, reporter_pin_hash) at the DB level prevents the
 *    same user from inflating their own vote.
 *  - Reporter must have a PIN (so anonymous one-shot reporters can't pile on).
 *  - Self-report is rejected.
 */
export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { application_id, reporter_pin_hash, reason } = body as {
    application_id?: string;
    reporter_pin_hash?: string;
    reason?: string;
  };

  if (!application_id || !reporter_pin_hash) {
    return NextResponse.json({ error: "Missing application_id or reporter_pin_hash" }, { status: 400 });
  }

  // Pull the app to verify it exists and to enforce self-report block.
  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select("id, pin_hash")
    .eq("id", application_id)
    .single();

  if (appErr || !app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Can't report your own entry.
  if (app.pin_hash && app.pin_hash === reporter_pin_hash) {
    return NextResponse.json({ error: "Cannot report your own entry" }, { status: 400 });
  }

  // Insert the report. unique(application_id, reporter_pin_hash) means a
  // duplicate from the same user just fails — we surface it as a noop-success.
  const { error: insertErr } = await supabase
    .from("spam_reports")
    .insert({
      application_id,
      reporter_pin_hash,
      reason: reason ? String(reason).slice(0, 200) : null,
    });

  // Ignore unique-violation; treat everything else as an error.
  if (insertErr && !String(insertErr.message).toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Count distinct reporters and auto-delete if we crossed the threshold.
  const { data: reports, error: countErr } = await supabase
    .from("spam_reports")
    .select("reporter_pin_hash")
    .eq("application_id", application_id);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  const distinct = new Set((reports || []).map(r => r.reporter_pin_hash));
  if (distinct.size >= DELETE_THRESHOLD) {
    const { error: delErr } = await supabase
      .from("applications")
      .delete()
      .eq("id", application_id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    return NextResponse.json({ count: distinct.size, deleted: true, threshold: DELETE_THRESHOLD });
  }

  return NextResponse.json({ count: distinct.size, deleted: false, threshold: DELETE_THRESHOLD });
}
