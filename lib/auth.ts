import { NextRequest } from "next/server";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "babygirl123";

export function isAuthorized(req: NextRequest): boolean {
  const headerPass = req.headers.get("x-admin-password");
  return headerPass != null && headerPass === ADMIN_PASSWORD;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
