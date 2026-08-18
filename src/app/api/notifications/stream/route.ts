import { getSession } from "@/lib/auth";
import { subscribeAdmins } from "@/lib/notifications/bus";
import type { NotificationPayload } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getSession();
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  if (process.env.NODE_ENV === "development") {
    console.log("[notifications][stream] admin connected");
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: NotificationPayload) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: notification\ndata: ${JSON.stringify(payload)}\n\n`,
            ),
          );
        } catch {
          // stream closed
        }
      };

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          // stream closed
        }
      }, 15_000);

      const unsubscribe = subscribeAdmins(send);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
