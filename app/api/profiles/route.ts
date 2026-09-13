import { NextRequest, NextResponse } from "next/server";
import { listChildProfiles, replaceChildProfiles } from "@/lib/child-profiles-server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { loadContentCategories } from "@/lib/categories-server";
import { createProfilesInput } from "@/lib/validation";

export async function GET(): Promise<Response> {
  const allowed = await loadContentCategories();
  const childProfiles = await listChildProfiles(allowed);

  return NextResponse.json({ childProfiles });
}

export async function PATCH(req: NextRequest): Promise<Response> {
  if (!isAuthorized(req)) return unauthorized();

  const body = await req.json();
  const allowed = await loadContentCategories();
  const parsed = createProfilesInput(allowed).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const childProfiles = await replaceChildProfiles(
    parsed.data.childProfiles,
    allowed,
  );

  return NextResponse.json({ childProfiles });
}
