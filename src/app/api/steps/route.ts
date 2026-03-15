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
  const { application_id, step_id, event_date, notes } = body;

  if (!application_id || !step_id || !event_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!STEP_ORDER.includes(step_id as StepId)) {
    return NextResponse.json({ error: "Invalid step_id" }, { status: 400 });
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

  const isLanding = step_id === "landing";
  await supabase
    .from("applications")
    .update({ current_step: step_id, is_complete: isLanding })
    .eq("id", application_id);

  return NextResponse.json(event, { status: 201 });
}
