import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    id: "varcasvi-admin",
    name: "varcasvi_ Admin",
    short_name: "Admin",
    description:
      "varcasvi_ admin panel — orders, payments, and store notifications.",
    start_url: "/admin",
    scope: "/admin/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
  });
}
