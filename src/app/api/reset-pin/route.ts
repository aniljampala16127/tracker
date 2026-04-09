import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Simple in-memory rate limiter (resets on redeploy, good enough for free tier)
const attempts: Record<string, { count: number; resetAt: number }> = {};

function isRateLimited(appId: string): boolean {
  const now = Date.now();
  const entry = attempts[appId];
  if (!entry || now > entry.resetAt) {
    attempts[appId] = { count: 1, resetAt: now + 60 * 60 * 1000 }; // 1 hour window
    return false;
  }
  entry.count++;
  return entry.count > 3; // Max 3 attempts per hour
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { id, initials, country_origin, submitted_date, new_pin_hash } = body;

  if (!id || !initials || !country_origin || !submitted_date || !new_pin_hash) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Rate limit
  if (isRateLimited(id)) {
    return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  }

  // Fetch the application
  const { data: app } = await supabase
    .from("applications")
    .select("id, initials, country_origin, pin_hash, step_events(step_id, event_date)")
    .eq("id", id)
    .single();

  if (!app) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  // Must have a PIN to reset (unclaimed entries don't need reset)
  if (!app.pin_hash) {
    return NextResponse.json({ error: "This entry has no PIN set" }, { status: 400 });
  }

  // Verify all 3 fields match
  const subEvent = (app.step_events as { step_id: string; event_date: string }[])
    ?.find(e => e.step_id === "submitted");

  const nameMatch = app.initials.toLowerCase().trim() === initials.toLowerCase().trim();
  const countryMatch = app.country_origin.toLowerCase().trim() === country_origin.toLowerCase().trim();
  const dateMatch = subEvent?.event_date === submitted_date;

  if (!nameMatch || !countryMatch || !dateMatch) {
    return NextResponse.json({ error: "Details don't match. Check your name, country, and exact submission date." }, { status: 403 });
  }

  // All verified — check PIN uniqueness then reset
  const { data: dup } = await supabase.from("applications").select("id").eq("pin_hash", new_pin_hash).neq("id", id).limit(1);
  if (dup && dup.length > 0) {
    return NextResponse.json({ error: "PIN already in use. Please try again.", pin_exists: true }, { status: 409 });
  }

  const { error } = await supabase
    .from("applications")
    .update({ pin_hash: new_pin_hash })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
