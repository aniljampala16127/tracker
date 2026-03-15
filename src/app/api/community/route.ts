import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: Request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const stream = searchParams.get("stream");
  const country = searchParams.get("country");

  let query = supabase.from("community_averages").select("*");
  if (stream) query = query.eq("stream", stream);
  if (country) query = query.eq("country_origin", country);

  const { data: averages, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    averages: averages || [],
    total_applications: count || 0,
  });
}
