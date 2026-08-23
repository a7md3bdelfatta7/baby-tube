import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, type AppSettings } from "@/db/schema";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { loadContentCategories } from "@/lib/categories-server";
import { createProfilesInput, createProfilesRead } from "@/lib/validation";

const SETTINGS_ID = 1;

async function getOrCreateSettings(): Promise<AppSettings> {
  const [existing] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID));

  if (existing) return existing;

  const [created] = await db
    .insert(appSettings)
    .values({ id: SETTINGS_ID })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID));

  if (!row) throw new Error("Unable to load profiles");

  return row;
}

export async function GET(): Promise<Response> {
  const settings = await getOrCreateSettings();
  const allowed = await loadContentCategories();
  const parsed = createProfilesRead(allowed).parse({
    childProfiles: settings.childProfiles,
  });

  return NextResponse.json({ childProfiles: parsed.childProfiles });
}

export async function PATCH(req: NextRequest): Promise<Response> {
  if (!isAuthorized(req)) return unauthorized();

  const body = await req.json();
  const allowed = await loadContentCategories();
  const parsed = createProfilesInput(allowed).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [settings] = await db
    .insert(appSettings)
    .values({ id: SETTINGS_ID, ...parsed.data })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: parsed.data,
    })
    .returning();

  return NextResponse.json({ childProfiles: settings.childProfiles });
}
