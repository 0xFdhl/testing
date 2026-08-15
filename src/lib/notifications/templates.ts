import type {
  NotificationEvent,
  NotificationTemplateRecord,
  NotificationTemplateVars,
} from "./types";

export const NOTIFICATION_VARIABLES = [
  "customer_name",
  "order_id",
  "total",
  "status",
] as const;

/**
 * Render template text, mengganti variabel {{key}} dengan nilai dari vars.
 * Variabel yang tidak dikenal dibiarkan apa adanya.
 */
export function renderTemplate(
  text: string,
  vars: NotificationTemplateVars,
): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    return key in vars
      ? vars[key as keyof NotificationTemplateVars]
      : match;
  });
}

export const DEFAULT_TEMPLATES: Record<
  NotificationEvent,
  Omit<NotificationTemplateRecord, "event" | "enabled">
> = {
  order_created: {
    title: "🛒 Order Baru Diterima",
    message:
      "Halo {{customer_name}}, order {{order_id}} sebesar {{total}} telah kami terima dan sedang menunggu pembayaran.",
    sound: "new-order.wav",
  },
  payment_success: {
    title: "💰 Pembayaran Berhasil!",
    message:
      "Halo {{customer_name}}, pembayaran untuk order {{order_id}} sebesar {{total}} telah berhasil. Status: {{status}}.",
    sound: "payment-success.wav",
  },
  payment_expired: {
    title: "⏰ Pembayaran Kedaluwarsa",
    message:
      "Halo {{customer_name}}, pembayaran untuk order {{order_id}} telah kedaluwarsa. Silakan buat order baru.",
    sound: "payment-expired.wav",
  },
  order_cancelled: {
    title: "❌ Order Dibatalkan",
    message:
      "Halo {{customer_name}}, order {{order_id}} telah dibatalkan. Status: {{status}}.",
    sound: "order-cancelled.wav",
  },
};

export const AVAILABLE_SOUNDS = [
  "new-order.wav",
  "payment-success.wav",
  "payment-expired.wav",
  "order-cancelled.wav",
] as const;