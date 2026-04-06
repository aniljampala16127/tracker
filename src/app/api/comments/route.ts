import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// POST — add a comment
export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { application_id, pin_hash, text, parent_id } = body;

  if (!application_id || !pin_hash || !text?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (text.trim().length > 500) {
    return NextResponse.json({ error: "Comment too long (max 500 chars)" }, { status: 400 });
  }

  // Look up commenter's name from their PIN
  const { data: commenterApps } = await supabase
    .from("applications")
    .select("initials, is_anonymous")
    .eq("pin_hash", pin_hash)
    .limit(1);

  const authorName = commenterApps?.[0]?.is_anonymous
    ? "Anonymous"
    : commenterApps?.[0]?.initials || "Anonymous";

  const { data, error } = await supabase.from("comments").insert({
    application_id,
    pin_hash,
    author_name: authorName,
    text: text.trim().slice(0, 500),
    parent_id: parent_id || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

// DELETE — remove own comment
export async function DELETE(request: Request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const pin_hash = searchParams.get("pin_hash");

  if (!id || !pin_hash) {
    return NextResponse.json({ error: "Missing id or pin_hash" }, { status: 400 });
  }

  // Verify ownership
  const { data: comment } = await supabase
    .from("comments")
    .select("pin_hash")
    .eq("id", id)
    .single();

  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.pin_hash !== pin_hash) {
    return NextResponse.json({ error: "Not your comment" }, { status: 403 });
  }

  await supabase.from("comments").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
