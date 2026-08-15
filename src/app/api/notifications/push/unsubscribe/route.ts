import { NextResponse } from "next/server";
import { auth } from "@/lib/next-auth";
import { removePushSubscription } from "@/lib/notifications/push";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint } = (body ?? {}) as Record<string, unknown>;
  if (typeof endpoint !== "string" || endpoint.length === 0) {
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