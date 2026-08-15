import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.208.1.45", "192.168.1.8"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
      },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
