import { NextRequest, NextResponse } from "next/server";
import { ADMIN_PASSWORD } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (typeof password !== "string" || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
