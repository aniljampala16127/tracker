import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// POST — verify PIN hash and return matching app IDs
// Used by landing page to reconnect without fetching all applications
export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { pin_hash } = body;

  if (!pin_hash) {
    return NextResponse.json({ error: "Missing pin_hash" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("pin_hash", pin_hash);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No entries found with this PIN", matched: [] }, { status: 404 });
  }

  return NextResponse.json({
    matched: data.map(a => a.id),
  });
}
