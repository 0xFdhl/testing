import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getMonthKey } from "@/lib/store-time";
import { recordMonthlyVisitor } from "@/lib/store-visitors";
import {
  checkRateLimit,
  getClientIp,
  isSameOrigin,
} from "@/lib/rate-limit";

const VISITOR_COOKIE = "store_visitor_id";
const VISITOR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`store-visit:${ip}`, 30, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return new NextResponse(null, { status: 204 });
  }

  const rawVisitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId =
    rawVisitorId && VISITOR_ID_PATTERN.test(rawVisitorId)
      ? rawVisitorId
      : randomUUID();
  const month = getMonthKey(new Date());

  await recordMonthlyVisitor(visitorId, month);

  const response = new NextResponse(null, { status: 204 });
  if (visitorId !== rawVisitorId) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return response;
}
