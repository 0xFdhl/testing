import { AuthProvider } from "@/components/auth/auth-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartShell } from "@/components/cart/cart-shell";
import { SiteFooter } from "@/components/layout/site-footer";
import { InstallAppBanner } from "@/components/layout/install-app-banner";

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
        <InstallAppBanner />
      </CartProvider>
    </AuthProvider>
  );
}
