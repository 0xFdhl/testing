import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID, createHmac } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const state = vi.hoisted(() => ({ db: undefined as unknown as PrismaClient, notify: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ get prisma() { return state.db; } }));
vi.mock("@/lib/notifications/emit", () => ({ emitOrderNotification: state.notify, notificationEventForStatus: (status: string) => status === "PAID" ? "payment_success" : "payment_expired" }));
vi.mock("@/lib/next-auth", () => ({ auth: state.auth }));

import { checkoutForUser } from "./checkout";
import { reconcilePayment } from "./reconcile";
import { POST as xenditWebhook } from "@/app/api/webhook/xendit/route";
import { POST as stripeWebhook } from "@/app/api/webhook/stripe/route";
import { markOrderCancelledIfPending, getCheckoutOrder } from "@/actions/checkout";
import { authenticateAdmin, hashPassword } from "@/lib/auth";

// Opt-in only. Creates/drops ONE random schema, never public tables. No provider
// requests or notifications escape the test: both boundaries are stubbed.
const connectionString = process.env.PAYMENT_TEST_DATABASE_URL;
const schema = `payment_test_${randomUUID().replaceAll("-", "")}`;
let control: Client;
let created = false;
const fetchMock = vi.fn();
const customer = { customerName: "Integration Test", customerEmail: "payment-test@example.invalid", customerPhone: "+628123456789" };
const items = [{ productSlug: "integration-shirt", size: "M" as const, quantity: 2 }];
const invoice = { id: "inv-test", external_id: "ORD-test", amount: 200000, currency: "IDR", status: "PAID" };

function xRequest(payload: unknown = invoice, token = "token-test") {
  return new Request("http://localhost/api/webhook/xendit", { method: "POST", headers: { "x-callback-token": token }, body: JSON.stringify(payload) });
}
function sRequest(session: Record<string, unknown>, type = "checkout.session.completed", eventId = "evt-test") {
  const raw = JSON.stringify({ id: eventId, type, data: { object: session } });
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", "whsec_test").update(`${t}.${raw}`).digest("hex");
  return new Request("http://localhost/api/webhook/stripe", { method: "POST", headers: { "stripe-signature": `t=${t},v1=${sig}` }, body: raw });
}
async function seedOrder(patch: Record<string, unknown> = {}) {
  return state.db.order.create({ data: {
    externalId: "ORD-test", userId: "test-user", gatewayInvoiceId: "inv-test", checkoutKey: "key-test", provider: "xendit", currency: "IDR",
    paymentAmount: 200000, paymentLive: false, amount: 200000, lineItems: items.map((i) => ({ ...i, productName: "Shirt", unitPrice: 100000 })),
    ...customer, ...patch,
  } });
}

describe.skipIf(!connectionString)("payment integration: isolated PostgreSQL + mocked gateways", () => {
  beforeAll(async () => {
    control = new Client({ connectionString, connectionTimeoutMillis: 10000 });
    await control.connect();
    if (!/^payment_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Unsafe test schema");
    await control.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await control.query(`SET search_path TO "${schema}"`);
    const dir = join(process.cwd(), "prisma/migrations");
    for (const folder of readdirSync(dir).filter((name) => name !== "migration_lock.toml").sort()) {
      const sql = readFileSync(join(dir, folder, "migration.sql"), "utf8").replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
      if (/\bpublic\b/i.test(sql)) throw new Error("Migration references public schema; isolate it before testing");
      await control.query(sql);
    }
    state.db = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 4, connectionTimeoutMillis: 10000, options: `-c search_path=${schema}` }, { schema }) });
    const current = await state.db.$queryRaw<Array<{ name: string }>>`SELECT current_schema() AS name`;
    expect(current[0].name).toBe(schema);
  }, 60000);

  afterAll(async () => {
    vi.unstubAllEnvs(); vi.unstubAllGlobals();
    await state.db?.$disconnect();
    if (created && /^payment_test_[a-f0-9]{32}$/.test(schema)) await control.query(`DROP SCHEMA "${schema}" CASCADE`);
    await control?.end();
  }, 30000);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv("XENDIT_MODE", "test"); vi.stubEnv("XENDIT_TEST_SECRET_KEY", "xnd_test_local"); vi.stubEnv("XENDIT_TEST_WEBHOOK_TOKEN", "token-test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test"); vi.stubEnv("ADMIN_JWT_SECRET", "integration-only-secret-at-least-32-bytes");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"); vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => { throw new Error("Unexpected external request in integration test"); });
    await state.db.webhookEvent.deleteMany(); await state.db.order.deleteMany(); await state.db.product.deleteMany(); await state.db.user.deleteMany(); await state.db.authThrottle.deleteMany(); await state.db.adminUser.deleteMany();
    await state.db.user.create({ data: { id: "test-user", region: "id" } });
    await state.db.product.create({ data: { slug: "integration-shirt", name: "Shirt", price: 100000, category: "top", sizes: ["M"], stock: { M: 8 }, images: [], sizingInfo: [], shippingInfo: [], returnsInfo: [] } });
    state.auth.mockResolvedValue({ user: { id: "test-user" } });
  }, 30000);

  it("verifies a paid Xendit invoice and ignores an already processed delivery", async () => {
    await seedOrder(); fetchMock.mockResolvedValue(new Response(JSON.stringify(invoice)));
    expect((await xenditWebhook(xRequest())).status).toBe(200);
    expect((await xenditWebhook(xRequest())).status).toBe(200);
    expect((await state.db.order.findUniqueOrThrow({ where: { externalId: "ORD-test" } })).status).toBe("PAID");
    expect(state.notify).toHaveBeenCalledTimes(1);
  });

  it.each([{ id: "different-invoice" }, { amount: 1 }, { currency: "USD" }])("rejects tampered invoice binding %j", async (patch) => {
    await seedOrder();
    expect((await xenditWebhook(xRequest({ ...invoice, ...patch }))).status).toBeGreaterThanOrEqual(400);
    expect((await state.db.order.findUniqueOrThrow({ where: { externalId: "ORD-test" } })).status).toBe("PENDING");
    expect(state.notify).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callbacks without storing events", async () => {
    expect((await xenditWebhook(xRequest(invoice, "wrong"))).status).toBe(401);
    expect(await state.db.webhookEvent.count()).toBe(0);
  });

  it("retries failed events after provider recovery", async () => {
    await seedOrder(); fetchMock.mockRejectedValueOnce(new Error("Provider timeout")).mockImplementation(async () => new Response(JSON.stringify(invoice)));
    expect((await xenditWebhook(xRequest())).status).toBe(500);
    expect((await xenditWebhook(xRequest())).status).toBe(200);
    expect((await state.db.webhookEvent.findFirstOrThrow()).status).toBe("processed");
  });

  it("rejects mismatched authoritative amounts even when callback matches", async () => {
    await seedOrder(); fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...invoice, amount: 1 })));
    expect((await xenditWebhook(xRequest())).status).toBe(500);
    expect((await state.db.order.findFirstOrThrow()).status).toBe("PENDING");
  });

  it("distinguishes pending and paid callbacks for the same invoice", async () => {
    await seedOrder();
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ ...invoice, status: "PENDING" }))).mockImplementationOnce(async () => new Response(JSON.stringify(invoice)));
    expect((await xenditWebhook(xRequest({ ...invoice, status: "PENDING" }))).status).toBe(200);
    expect((await xenditWebhook(xRequest())).status).toBe(200);
    expect(await state.db.webhookEvent.count()).toBe(2);
    expect((await state.db.order.findFirstOrThrow()).status).toBe("PAID");
  });

  it("restocks only once under concurrent expired deliveries and retries", async () => {
    await seedOrder(); const expired = { ...invoice, status: "EXPIRED" };
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(expired)));
    await Promise.all([xenditWebhook(xRequest(expired)), xenditWebhook(xRequest(expired))]);
    expect((await xenditWebhook(xRequest(expired))).status).toBe(200);
    expect((await state.db.product.findFirstOrThrow()).stock).toEqual({ M: 10 });
    expect((await state.db.order.findFirstOrThrow()).checkoutKey).toBeNull();
    expect(state.notify).toHaveBeenCalledTimes(1);
  });

  it("does not cancel or release stock from a browser redirect", async () => {
    await seedOrder(); fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...invoice, status: "PENDING" })));
    expect((await markOrderCancelledIfPending("ORD-test", "test-user"))?.status).toBe("PENDING");
    expect((await state.db.product.findFirstOrThrow()).stock).toEqual({ M: 8 });
    state.auth.mockResolvedValue({ user: { id: "attacker" } });
    expect(await getCheckoutOrder("ORD-test", "test-user")).toBeNull();
  });

  it("blocks legacy and conflicting terminal orders for manual reconciliation", async () => {
    await seedOrder({ paymentAmount: null });
    await expect(reconcilePayment("ORD-test", { externalId: "ORD-test", invoiceId: "inv-test", provider: "xendit", amount: 200000, currency: "IDR", live: false, status: "PAID" })).rejects.toThrow("snapshot");
    await state.db.order.update({ where: { externalId: "ORD-test" }, data: { paymentAmount: 200000, status: "CANCELLED" } });
    fetchMock.mockResolvedValue(new Response(JSON.stringify(invoice)));
    await expect(reconcilePayment("ORD-test")).rejects.toThrow("Conflicting terminal");
  });

  it("deduplicates concurrent checkouts in PostgreSQL and converts Stripe units", async () => {
    await state.db.user.update({ where: { id: "test-user" }, data: { region: "intrl" } });
    fetchMock.mockImplementation(async (_url, init) => {
      const params = new URLSearchParams(init.body);
      expect(params.get("line_items[0][price_data][unit_amount]")).toBe("640");
      return new Response(JSON.stringify({ id: "cs-test", metadata: { externalId: params.get("metadata[externalId]") }, amount_total: 1280, currency: "usd", livemode: false, url: "https://checkout.stripe.com/test", status: "open", payment_status: "unpaid" }));
    });
    const results = await Promise.all([checkoutForUser("test-user", items, customer, "/checkout?failed=1"), checkoutForUser("test-user", items, customer, "/checkout?failed=1")]);
    expect(results.some((r) => r.ok)).toBe(true);
    expect(await state.db.order.count()).toBe(1); expect(fetchMock).toHaveBeenCalledTimes(1);
    const order = await state.db.order.findFirstOrThrow();
    expect(order.paymentAmount).toBe(1280); expect(order.amount).toBe(200000);
    expect((await state.db.product.findFirstOrThrow()).stock).toEqual({ M: 6 });
    expect((await checkoutForUser("test-user", items, customer, "/checkout?failed=1")).redirectUrl).toBe(order.invoiceUrl);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retains pending reservations after gateway timeouts without issuing a second invoice", async () => {
    fetchMock.mockRejectedValue(new Error("Timeout after acceptance"));
    await checkoutForUser("test-user", items, customer, "/checkout?failed=1");
    await checkoutForUser("test-user", items, customer, "/checkout?failed=1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await state.db.order.findFirstOrThrow()).status).toBe("PENDING");
    expect((await state.db.product.findFirstOrThrow()).stock).toEqual({ M: 6 });
  });

  it("handles signed Stripe async success and rejects a live/test mismatch", async () => {
    await seedOrder({ provider: "stripe", currency: "USD", paymentAmount: 1280, gatewayInvoiceId: "cs-test" });
    const session = { id: "cs-test", metadata: { externalId: "ORD-test" }, amount_total: 1280, currency: "usd", livemode: false, payment_status: "paid", status: "complete" };
    expect((await stripeWebhook(sRequest({ ...session, livemode: true }))).status).toBe(500);
    fetchMock.mockResolvedValue(new Response(JSON.stringify(session)));
    expect((await stripeWebhook(sRequest(session, "checkout.session.async_payment_succeeded", "evt-async"))).status).toBe(200);
    expect((await state.db.order.findFirstOrThrow()).status).toBe("PAID");
  });

  it("atomically throttles concurrent admin attempts across callers", async () => {
    await state.db.adminUser.create({ data: { email: "test-admin@example.invalid", name: "Test Admin", passwordHash: await hashPassword("correct-test-password") } });
    const results = await Promise.all(Array.from({ length: 8 }, () => authenticateAdmin("test-admin@example.invalid", "correct-test-password")));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect((await state.db.authThrottle.findFirstOrThrow()).attempts).toBe(8);
  });
});
