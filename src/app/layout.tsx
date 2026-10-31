import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Pinyon_Script } from "next/font/google";
import "./globals.css";

const creatoDisplay = localFont({
  src: [
    { path: "./fonts/creato-display/CreatoDisplay-Regular.otf", weight: "400" },
    { path: "./fonts/creato-display/CreatoDisplay-Medium.otf", weight: "500" },
    { path: "./fonts/creato-display/CreatoDisplay-Bold.otf", weight: "700" },
    { path: "./fonts/creato-display/CreatoDisplay-Black.otf", weight: "900" },
  ],
  variable: "--font-creato-display",
  display: "swap",
});

const logoScript = Pinyon_Script({
  variable: "--font-logo-script",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "varcasvi_",
    template: "%s | varcasvi_",
  },
  description:
    "be better",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "varcasvi_",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${creatoDisplay.variable} ${logoScript.variable} h-full`}>
      <body className="min-h-full antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-md focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
