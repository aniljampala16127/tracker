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
  const { application_id, cohort_month, pin_hash, text, parent_id, anonymous } = body;

  if (!pin_hash || !text?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!application_id && !cohort_month) {
    return NextResponse.json({ error: "Need application_id or cohort_month" }, { status: 400 });
  }

  if (text.trim().length > 500) {
    return NextResponse.json({ error: "Comment too long (max 500 chars)" }, { status: 400 });
  }

  let authorName = "Anonymous";
  if (!anonymous) {
    const { data: commenterApps } = await supabase
      .from("applications")
      .select("initials, is_anonymous")
      .eq("pin_hash", pin_hash)
      .limit(1);

    authorName = commenterApps?.[0]?.is_anonymous
      ? "Anonymous"
      : commenterApps?.[0]?.initials || "Anonymous";
  }

  const { data, error } = await supabase.from("comments").insert({
    application_id: application_id || null,
    cohort_month: cohort_month || null,
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

// GET — fetch cohort comments
export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .not("cohort_month", "is", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || [], {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
