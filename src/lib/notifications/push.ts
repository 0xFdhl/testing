import "server-only";
import webpush from "web-push";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { NotificationPayload } from "./types";

const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(VAPID_SUBJECT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string },
): Promise<void> {
  await prisma.notificationSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      userAgent: sub.userAgent,
    },
    update: {
      userId,
      p256dh: sub.p256dh,
      auth: sub.auth,
      userAgent: sub.userAgent,
    },
  });
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await prisma.notificationSubscription.deleteMany({ where: { endpoint } });
}

export async function sendPushToUser(
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  if (!ensureVapid()) return;

  const subs = await prisma.notificationSubscription.findMany({
    where: { userId },
  });
  if (subs.length === 0) return;

  const data = JSON.stringify({
    title: payload.title,
    body: payload.message,
    icon: "/favicon.ico",
    url: "/account",
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          data,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.notificationSubscription.deleteMany({
            where: { endpoint: sub.endpoint },
          });
        } else {
          logger.warn("notifications.push send failed", {
            endpoint: sub.endpoint,
            err: String(err),
          });
        }
      }
    }),
  );
}