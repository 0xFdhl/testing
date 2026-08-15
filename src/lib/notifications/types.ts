export type NotificationEvent =
  | "order_created"
  | "payment_success"
  | "payment_expired"
  | "order_cancelled";

export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  "order_created",
  "payment_success",
  "payment_expired",
  "order_cancelled",
];

export type NotificationTemplateVars = {
  customer_name: string;
  order_id: string;
  total: string;
  status: string;
};

export type NotificationPayload = {
  id: string;
  event: NotificationEvent;
  title: string;
  message: string;
  sound: string | null;
  externalId: string | null;
  url: string | null;
  createdAt: string;
};

export type NotificationTemplateRecord = {
  event: NotificationEvent;
  enabled: boolean;
  title: string;
  message: string;
  sound: string | null;
};

export type NotificationLogRecord = {
  id: string;
  event: string;
  externalId: string | null;
  title: string;
  message: string;
  sound: string | null;
  channel: string;
  status: string;
  createdAt: string;
};