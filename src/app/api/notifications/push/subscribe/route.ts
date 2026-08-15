import { NextResponse } from "next/server";
import { auth } from "@/lib/next-auth";
import { savePushSubscription } from "@/lib/notifications/push";

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

  const { endpoint, p256dh, auth: authKey, userAgent } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (
    typeof endpoint !== "string" ||
    !/^https?:\/\//.test(endpoint) ||
    typeof p256dh !== "string" ||
    p256dh.length === 0 ||
    typeof authKey !== "string" ||
    authKey.length === 0
  ) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  try {
    await savePushSubscription(session.user.id, {
      endpoint,
      p256dh,
      auth: authKey,
      userAgent: typeof userAgent === "string" ? userAgent : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 },
    );
  }
}