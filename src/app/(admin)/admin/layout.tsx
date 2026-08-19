import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "varcasvi_ Admin",
  },
};

export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}