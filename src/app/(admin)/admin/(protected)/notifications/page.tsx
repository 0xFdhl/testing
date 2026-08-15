import { NotificationsForm } from "@/components/admin/notifications-form";
import {
  getNotificationLogs,
  getNotificationTemplates,
} from "@/lib/notifications/emit";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const [templates, logs] = await Promise.all([
    getNotificationTemplates(),
    getNotificationLogs(20),
  ]);

  return <NotificationsForm templates={templates} logs={logs} />;
}