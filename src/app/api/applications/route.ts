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
    .select("*, step_events(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { initials, sponsor_status, stream, country_origin, subcategory, province, submitted_date, notes, pin_hash } = body;

  if (!initials || !sponsor_status || !stream || !country_origin || !submitted_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!pin_hash) {
    return NextResponse.json({ error: "PIN is required" }, { status: 400 });
  }

  const { data: app, error: appError } = await supabase
    .from("applications")
    .insert({
      initials: initials.trim().slice(0, 20),
      sponsor_status,
      stream,
      country_origin,
      subcategory: subcategory || null,
      province: province || "Ontario",
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
