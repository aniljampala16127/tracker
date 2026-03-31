import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { password } = await request.json();
  const masterPassword = process.env.ADMIN_PASSWORD;

  if (!masterPassword) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  }

  if (password === masterPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Wrong password" }, { status: 401 });
}
