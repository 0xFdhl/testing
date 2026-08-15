import "server-only";
import { formatIdr } from "@/lib/format";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { emitToAdmins, emitToAllUsers, emitToUser } from "./bus";
import { sendPushToUser } from "./push";
import { DEFAULT_TEMPLATES, renderTemplate } from "./templates";
import {
  NOTIFICATION_EVENTS,
  type NotificationEvent,
  type NotificationLogRecord,
  type NotificationPayload,
  type NotificationTemplateRecord,
  type NotificationTemplateVars,
} from "./types";

export function notificationEventForStatus(
  status: string,
): NotificationEvent | null {
  switch (status) {
    case "PAID":
      return "payment_success";
    case "EXPIRED":
      return "payment_expired";
    case "CANCELLED":
      return "order_cancelled";
    default:
      return null;
  }
}

function buildVars(order: {
  externalId: string;
  customerName: string;
  amount: number;
  status: string;
}): NotificationTemplateVars {
  return {
    customer_name: order.customerName,
    order_id: order.externalId,
    total: formatIdr(order.amount),
    status: order.status,
  };
}

export async function emitOrderNotification(
  order: {
    externalId: string;
    userId?: string;
    customerName: string;
    amount: number;
    status: string;
  },
  event: NotificationEvent,
): Promise<void> {
  try {
    const row = await prisma.notificationTemplate.findUnique({
      where: { event },
    });
    const fallback = DEFAULT_TEMPLATES[event];
    const enabled = row?.enabled ?? true;
    const title = row?.title ?? fallback.title;
    const message = row?.message ?? fallback.message;
    const sound = row?.sound ?? fallback.sound ?? null;

    const vars = buildVars(order);
    const payload: NotificationPayload = {
      id: crypto.randomUUID(),
      event,
      title: renderTemplate(title, vars),
      message: renderTemplate(message, vars),
      sound,
      externalId: order.externalId,
      url: null,
      createdAt: new Date().toISOString(),
    };

    await prisma.notificationLog.create({
      data: {
        event,
        externalId: order.externalId,
        userId: order.userId ?? null,
        title: payload.title,
        message: payload.message,
        sound,
        channel: "realtime",
        status: enabled ? "sent" : "skipped",
      },
    });

    if (!enabled) return;

    if (order.userId) {
      emitToUser(order.userId, payload);
      await sendPushToUser(order.userId, payload);
    }
    emitToAdmins(payload);
  } catch (err) {
    logger.error("notifications.emitOrderNotification failed", {
      event,
      externalId: order.externalId,
      err: String(err),
    });
  }
}

export async function emitTestNotification(
  event: NotificationEvent,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const row = await prisma.notificationTemplate.findUnique({
      where: { event },
    });
    const fallback = DEFAULT_TEMPLATES[event];
    const title = row?.title ?? fallback.title;
    const message = row?.message ?? fallback.message;
    const sound = row?.sound ?? fallback.sound ?? null;

    const vars: NotificationTemplateVars = {
      customer_name: "Test Customer",
      order_id: "ORD-TEST-001",
      total: "Rp.299.000",
      status: "PAID",
    };

    const payload: NotificationPayload = {
      id: crypto.randomUUID(),
      event,
      title: renderTemplate(title, vars),
      message: renderTemplate(message, vars),
      sound,
      externalId: null,
      url: null,
      createdAt: new Date().toISOString(),
    };

    await prisma.notificationLog.create({
      data: {
        event,
        title: payload.title,
        message: payload.message,
        sound,
        channel: "test",
        status: "sent",
      },
    });

    emitToAdmins(payload);
    emitToAllUsers(payload);
    return { ok: true };
  } catch (err) {
    logger.error("notifications.emitTestNotification failed", {
      event,
      err: String(err),
    });
    return { ok: false, error: "Failed to send test notification" };
  }
}

export async function getNotificationTemplates(): Promise<
  NotificationTemplateRecord[]
> {
  const rows = await prisma.notificationTemplate.findMany();
  const byEvent = new Map(rows.map((r) => [r.event, r]));

  return NOTIFICATION_EVENTS.map((event) => {
    const fallback = DEFAULT_TEMPLATES[event];
    const row = byEvent.get(event);
    return {
      event,
      enabled: row?.enabled ?? true,
      title: row?.title ?? fallback.title,
      message: row?.message ?? fallback.message,
      sound: row?.sound ?? fallback.sound ?? null,
    };
  });
}

export async function updateNotificationTemplate(
  event: NotificationEvent,
  data: {
    enabled: boolean;
    title: string;
    message: string;
    sound: string | null;
  },
): Promise<void> {
  await prisma.notificationTemplate.upsert({
    where: { event },
    create: { event, ...data },
    update: data,
  });
}

export async function getNotificationLogs(
  limit = 20,
): Promise<NotificationLogRecord[]> {
  const rows = await prisma.notificationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    event: r.event,
    externalId: r.externalId,
    title: r.title,
    message: r.message,
    sound: r.sound,
    channel: r.channel,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}