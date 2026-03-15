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
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { display_name, body: msgBody, application_id } = body;

  if (!display_name?.trim() || !msgBody?.trim()) {
    return NextResponse.json({ error: "Name and message required" }, { status: 400 });
  }

  if (msgBody.length > 2000) {
    return NextResponse.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      display_name: display_name.trim().slice(0, 30),
      body: msgBody.trim(),
      application_id: application_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
