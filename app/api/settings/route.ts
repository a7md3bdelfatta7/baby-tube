import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, type AppSettings } from "@/db/schema";
import { getOrCreateSettings } from "@/lib/app-settings-server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import {
  applyCategoryListUpdate,
  resolveContentCategories,
  validateCategoryRename,
} from "@/lib/categories-server";
import { settingsInput } from "@/lib/validation";

const SETTINGS_ID = 1;

export async function GET(): Promise<Response> {
  const settings = await getOrCreateSettings();
  return NextResponse.json({
    ...settings,
    contentCategories: resolveContentCategories(settings),
  });
}

export async function PATCH(req: NextRequest): Promise<Response> {
  if (!isAuthorized(req)) return unauthorized();

  const body = await req.json();
  const parsed = settingsInput.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const current = await getOrCreateSettings();
  const previousCategories = resolveContentCategories(current);
  const update: Partial<AppSettings> = {};

  if (parsed.data.screenTimeMinutes !== undefined) {
    update.screenTimeMinutes = parsed.data.screenTimeMinutes;
  }

  if (parsed.data.contentCategories !== undefined) {
    const nextCategories = parsed.data.contentCategories;

    if (parsed.data.categoryRename) {
      const renameError = validateCategoryRename(
        previousCategories,
        nextCategories,
        parsed.data.categoryRename,
      );

      if (renameError) {
        return NextResponse.json({ error: renameError }, { status: 400 });
      }

      await applyCategoryListUpdate(
        previousCategories,
        nextCategories,
        parsed.data.categoryRename,
      );
    } else {
      await applyCategoryListUpdate(previousCategories, nextCategories);
    }

    update.contentCategories = nextCategories;
  }

  const [settings] = await db
    .insert(appSettings)
    .values({ id: SETTINGS_ID, ...update })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: update,
    })
    .returning();

  return NextResponse.json({
    ...settings,
    contentCategories: resolveContentCategories(settings),
  });
}
