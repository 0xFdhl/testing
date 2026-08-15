import { AuthProvider } from "@/components/auth/auth-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartShell } from "@/components/cart/cart-shell";
import { SiteFooter } from "@/components/layout/site-footer";
import { NotificationListener } from "@/components/notifications/notification-listener";
import { PushSubscriptionManager } from "@/components/notifications/push-subscription";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <SiteFooter />
        <CartShell />
        <NotificationListener />
        <PushSubscriptionManager />
      </CartProvider>
    </AuthProvider>
  );
}
