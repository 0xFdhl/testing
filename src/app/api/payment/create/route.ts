import { NextResponse } from "next/server";
import { createPaymentSchema } from "@/schemas/payment";
import { isXenditTestMode } from "@/lib/xendit";
import { isStripeTestMode } from "@/lib/stripe";
import { toCheckoutErrorMessage } from "@/lib/payments/errors";
import { checkRateLimit, getClientIp, isSameOrigin } from "@/lib/rate-limit";
import { auth } from "@/lib/next-auth";
import { logger } from "@/lib/logger";
import { resolveGateway } from "@/lib/payments/router";
import {
  createCheckout,
  calculateAmountMinor,
  resolveCurrency,
} from "@/lib/payments";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden: invalid origin" }, { status: 403 });
  }

  const userId = session.user.id;
  const ip = getClientIp(req);

  const userLimit = checkRateLimit(`payment:user:${userId}`, 10, 60_000);
  if (!userLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(userLimit.retryAfterMs / 1000)) },
      },
    );
  }

  const ipLimit = checkRateLimit(`payment:ip:${ip}`, 30, 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests from this IP. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(ipLimit.retryAfterMs / 1000)) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const region: "id" | "intrl" = (session.user.region as "id" | "intrl" | undefined) ?? "id";
  const provider = resolveGateway(region);
  const currency = resolveCurrency(provider);
  const amountMinor = calculateAmountMinor(provider, data.amount);

  try {
    const session = await createCheckout(provider, {
      externalId: data.externalId,
      amountMinor,
      currency,
      description: data.description,
      customerEmail: data.payerEmail,
      customerName: data.customer?.given_names ?? "",
      customerPhone: data.customer?.mobile_number ?? "",
      items: data.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPriceMinor: item.price,
      })),
      successUrl: data.successRedirectUrl,
      cancelUrl: data.failureRedirectUrl,
    });

    return NextResponse.json({
      ok: true,
      mode: provider === "stripe" ? (isStripeTestMode() ? "test" : "live") : (isXenditTestMode() ? "test" : "live"),
      session: {
        id: session.sessionId,
        url: session.url,
        provider: session.provider,
      },
    });
  } catch (err) {
    logger.error("payment.create failed", { userId, provider, err: String(err) });
    return NextResponse.json(
      { ok: false, error: toCheckoutErrorMessage(err) },
      { status: 502 },
    );
  }
}
