import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { videoOrderInput } from "@/lib/validation";

export async function PUT(req: NextRequest): Promise<Response> {
  if (!isAuthorized(req)) return unauthorized();

  const body = await req.json();
  const parsed = videoOrderInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rows = sql.join(
    parsed.data.videoIds.map((id, index) => sql`(${id}::int, ${index + 1}::int)`),
    sql`, `,
  );

  await db.execute(sql`
    UPDATE ${videos}
    SET position = new_order.position
    FROM (VALUES ${rows}) AS new_order(id, position)
    WHERE ${videos.id} = new_order.id
  `);

  return NextResponse.json({ ok: true });
}
