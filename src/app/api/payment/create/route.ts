import { NextResponse } from "next/server";

// Retired: use the server-priced storefront checkout actions.
export async function POST() {
  return NextResponse.json(
    { error: "This payment endpoint has been retired. Use storefront checkout." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
