import { getSession } from "@/lib/auth";
import { auth } from "@/lib/next-auth";
import {
  subscribeAdmins,
  subscribeUser,
} from "@/lib/notifications/bus";
import type { NotificationPayload } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const admin = !userId ? await getSession() : null;

  const encoder = new TextEncoder();

  if (process.env.NODE_ENV === "development") {
    console.log(
      "[notifications][stream] connected",
      userId
        ? `user:${userId} + broadcast`
        : admin
          ? "admin"
          : "anonymous broadcast",
    );
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

      const unsubscribes: Array<() => void> = [];
      if (userId) {
        unsubscribes.push(subscribeUser(userId, send));
      } else if (admin) {
        unsubscribes.push(subscribeAdmins(send));
      }

      const unsubscribe = () => {
        for (const off of unsubscribes) off();
      };

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