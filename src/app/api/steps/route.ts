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

  // Date must not be in the future
  const today = new Date().toISOString().split("T")[0];
  if (event_date > today) {
    return NextResponse.json({ error: "Date cannot be in the future" }, { status: 400 });
  }

  // Verify PIN
  const { data: app } = await supabase
    .from("applications")
    .select("pin_hash")
    .eq("id", application_id)
    .single();

  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (app.pin_hash && app.pin_hash !== pin_hash) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }

  // Fetch existing steps to validate ordering
  const { data: existingSteps } = await supabase
    .from("step_events")
    .select("step_id, event_date")
    .eq("application_id", application_id);

  if (existingSteps) {
    const stepIdx = STEP_ORDER.indexOf(step_id as StepId);
    if (stepIdx > 0) {
      const prevStepId = STEP_ORDER[stepIdx - 1];
      const prevEvent = existingSteps.find(e => e.step_id === prevStepId);
      if (prevEvent && event_date < prevEvent.event_date) {
        return NextResponse.json(
          { error: "Date must be on or after the previous step" },
          { status: 400 }
        );
      }
    }
  }

  const { data: event, error } = await supabase
    .from("step_events")
    .insert({
      application_id,
      step_id,
      event_date,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Step already recorded" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const isLanding = step_id === "ecopr";
  await supabase
    .from("applications")
    .update({ current_step: step_id, is_complete: isLanding })
    .eq("id", application_id);

  return NextResponse.json(event, { status: 201 });
}

// DELETE — undo the most recent step
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

  // Only allow removing the latest step
  const { data: allSteps } = await supabase
    .from("step_events")
    .select("step_id")
    .eq("application_id", application_id);

  if (!allSteps) return NextResponse.json({ error: "No steps found" }, { status: 404 });

  const completedIds = allSteps.map(s => s.step_id);
  const latestIdx = Math.max(...completedIds.map(id => STEP_ORDER.indexOf(id as StepId)));
  const latestStepId = STEP_ORDER[latestIdx];

  if (step_id !== latestStepId) {
    return NextResponse.json({ error: "Can only undo the most recent step" }, { status: 400 });
  }

  const { error } = await supabase
    .from("step_events")
    .delete()
    .eq("application_id", application_id)
    .eq("step_id", step_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const prevIdx = latestIdx - 1;
  const prevStepId = prevIdx >= 0 ? STEP_ORDER[prevIdx] : "submitted";
  await supabase
    .from("applications")
    .update({ current_step: prevStepId, is_complete: false })
    .eq("id", application_id);

  return NextResponse.json({ success: true, reverted_to: prevStepId });
}
