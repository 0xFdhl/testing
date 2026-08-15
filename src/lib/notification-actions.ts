"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import {
  emitTestNotification,
  updateNotificationTemplate,
} from "@/lib/notifications/emit";
import { AVAILABLE_SOUNDS } from "@/lib/notifications/templates";
import { NOTIFICATION_EVENTS, type NotificationEvent } from "@/lib/notifications/types";

export type ActionResult = {
  success: boolean;
  error?: string;
};

function isNotificationEvent(value: string): value is NotificationEvent {
  return NOTIFICATION_EVENTS.includes(value as NotificationEvent);
}

export async function updateNotificationTemplateAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();

  const event = String(formData.get("event") ?? "");
  if (!isNotificationEvent(event)) {
    return { success: false, error: "Invalid event" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const rawSound = String(formData.get("sound") ?? "");
  const sound = rawSound === "" ? null : rawSound;

  if (!title || !message) {
    return { success: false, error: "Title and message are required" };
  }
  if (sound && !AVAILABLE_SOUNDS.includes(sound as (typeof AVAILABLE_SOUNDS)[number])) {
    return { success: false, error: "Invalid sound" };
  }

  try {
    await updateNotificationTemplate(event, {
      enabled: formData.get("enabled") === "on",
      title,
      message,
      sound,
    });
    await logAudit(session, "UPDATE", "NotificationTemplate", event, { title });
    revalidatePath("/admin/notifications");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save notification template" };
  }
}

export async function testNotificationAction(
  event: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!isNotificationEvent(event)) {
    return { success: false, error: "Invalid event" };
  }

  const result = await emitTestNotification(event);
  if (result.ok) {
    await logAudit(session, "TEST", "NotificationTemplate", event);
    revalidatePath("/admin/notifications");
    return { success: true };
  }
  return { success: false, error: result.error };
}