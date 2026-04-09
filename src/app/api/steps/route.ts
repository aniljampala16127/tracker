import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { STEP_ORDER } from "@/lib/constants";
import { StepId } from "@/lib/types";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Recalculate current_step as the highest completed step in STEP_ORDER */
async function recalcCurrentStep(supabase: ReturnType<typeof getSupabase>, application_id: string) {
  const { data: allSteps } = await supabase
    .from("step_events")
    .select("step_id")
    .eq("application_id", application_id);

  if (!allSteps || allSteps.length === 0) {
    await supabase
      .from("applications")
      .update({ current_step: "submitted", is_complete: false })
      .eq("id", application_id);
    return;
  }

  const completedIds = allSteps.map(s => s.step_id as StepId);
  const highestIdx = Math.max(...completedIds.map(id => STEP_ORDER.indexOf(id)));
  const highestStep = STEP_ORDER[highestIdx] || "submitted";
  const isComplete = highestStep === "ecopr";

  await supabase
    .from("applications")
    .update({ current_step: highestStep, is_complete: isComplete })
    .eq("id", application_id);
}

// POST — add a new step (non-sequential: any step can be added)
export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { application_id, step_id, event_date, notes, pin_hash } = body;

  if (!application_id || !step_id || !event_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!STEP_ORDER.includes(step_id as StepId)) {
    return NextResponse.json({ error: "Invalid step_id" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  if (event_date > today) {
    return NextResponse.json({ error: "Date cannot be in the future" }, { status: 400 });
  }

  const { data: app } = await supabase
    .from("applications")
    .select("pin_hash")
    .eq("id", application_id)
    .single();

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.pin_hash && app.pin_hash !== pin_hash) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }

  // Validate: step date must be on or after submission date
  const { data: subEvent } = await supabase
    .from("step_events")
    .select("event_date")
    .eq("application_id", application_id)
    .eq("step_id", "submitted")
    .single();

  if (subEvent && event_date < subEvent.event_date) {
    return NextResponse.json({ error: "Date cannot be before your submission date" }, { status: 400 });
  }

  const { data: event, error } = await supabase
    .from("step_events")
    .insert({ application_id, step_id, event_date, notes: notes || null })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Step already recorded" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recalcCurrentStep(supabase, application_id);

  return NextResponse.json(event, { status: 201 });
}

// PATCH — edit date on an existing step
export async function PATCH(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { application_id, step_id, event_date, pin_hash } = body;

  if (!application_id || !step_id || !event_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (step_id === "submitted") {
    return NextResponse.json({ error: "Use the application PATCH endpoint to edit submission date" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  if (event_date > today) {
    return NextResponse.json({ error: "Date cannot be in the future" }, { status: 400 });
  }

  const { data: app } = await supabase
    .from("applications")
    .select("pin_hash")
    .eq("id", application_id)
    .single();

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.pin_hash && app.pin_hash !== pin_hash) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }

  const { data: updated, error } = await supabase
    .from("step_events")
    .update({ event_date })
    .eq("application_id", application_id)
    .eq("step_id", step_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  return NextResponse.json(updated);
}

// DELETE — undo any completed step (not just the latest)
export async function DELETE(request: Request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const application_id = searchParams.get("application_id");
  const step_id = searchParams.get("step_id");
  const pin_hash = searchParams.get("pin_hash");

  if (!application_id || !step_id) {
    return NextResponse.json({ error: "Missing application_id or step_id" }, { status: 400 });
  }

  if (step_id === "submitted") {
    return NextResponse.json({ error: "Cannot remove the submitted step" }, { status: 400 });
  }

  const { data: app } = await supabase
    .from("applications")
    .select("pin_hash")
    .eq("id", application_id)
    .single();

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.pin_hash && app.pin_hash !== pin_hash) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }

  const { error } = await supabase
    .from("step_events")
    .delete()
    .eq("application_id", application_id)
    .eq("step_id", step_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recalcCurrentStep(supabase, application_id);
  return NextResponse.json({ success: true });
}
