import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import { InstallAppBanner } from "@/components/layout/install-app-banner";
import { NotificationListener } from "@/components/notifications/notification-listener";
import { requireAdmin } from "@/lib/auth";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <AdminTopbar name={session.name} email={session.email} />
        <main id="main-content" className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
      <NotificationListener />
      <InstallAppBanner
        appName="varcasvi_ Admin"
        benefit="Get push notifications for new orders and payments."
      />
    </div>
  );
}