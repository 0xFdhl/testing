import "server-only";
import { EventEmitter } from "events";
import type { NotificationPayload } from "./types";

// In-process pub/sub untuk SSE. Single-instance only:
// untuk deployment multi-instance, ganti dengan Redis pub/sub.
//
// Emitter disimpan di globalThis (pola globalForPrisma di src/lib/prisma.ts)
// agar server action dan route handler berbagi instance yang sama —
// module-scope singleton bisa ter-duplikasi antar bundle Next.js.
const globalForBus = globalThis as unknown as {
  notificationBus?: EventEmitter;
};

const emitter = globalForBus.notificationBus ?? new EventEmitter();
if (process.env.NODE_ENV !== "production") {
  globalForBus.notificationBus = emitter;
}
emitter.setMaxListeners(100);

const MAX_LISTENERS_PER_CHANNEL = 50;

export function subscribeUser(
  userId: string,
  listener: (payload: NotificationPayload) => void,
): () => void {
  const channel = `user:${userId}`;
  if (emitter.listenerCount(channel) >= MAX_LISTENERS_PER_CHANNEL) {
    return () => {};
  }
  emitter.on(channel, listener);
  return () => emitter.off(channel, listener);
}

export function subscribeAdmins(
  listener: (payload: NotificationPayload) => void,
): () => void {
  if (emitter.listenerCount("admins") >= MAX_LISTENERS_PER_CHANNEL) {
    return () => {};
  }
  emitter.on("admins", listener);
  return () => emitter.off("admins", listener);
}

export function emitToUser(userId: string, payload: NotificationPayload): void {
  emitter.emit(`user:${userId}`, payload);
}

export function emitToAdmins(payload: NotificationPayload): void {
  emitter.emit("admins", payload);
}