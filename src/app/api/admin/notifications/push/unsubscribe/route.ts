import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { removePushSubscription } from "@/lib/notifications/push";
import { isSameOrigin } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const session = await requireAdminApi();
  if (session instanceof Response) return session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof endpoint !== "string" ||
    endpoint.length === 0 ||
    endpoint.length > 2048
  ) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  try {
    await removePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 },
    );
  }
}
