import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { createCheckoutSession, verifyWebhookSignature } from "./client";

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const body = '{"id":"evt_test"}';
function signed(age: number, multiple = false) {
  const t = Math.floor(Date.now() / 1000) - age;
  const sig = createHmac("sha256", "whsec_test").update(`${t}.${body}`).digest("hex");
  return new Request("http://localhost", { headers: { "stripe-signature": `t=${t},v1=${sig}${multiple ? `,v1=${"0".repeat(64)}` : ""}` } });
}
describe("Stripe verification", () => {
  it("accepts any valid signature during secret rotation", () => expect(verifyWebhookSignature(signed(0, true), body)).toBe(true));
  it.each([301, -301])("rejects stale/future signed events (%s)", (age) => expect(verifyWebhookSignature(signed(age), body)).toBe(false));
  it("rejects a changed raw body", () => expect(verifyWebhookSignature(signed(0), `${body} `)).toBe(false));
  it("fails closed without webhook secret", () => { vi.stubEnv("STRIPE_WEBHOOK_SECRET", ""); expect(verifyWebhookSignature(signed(0), body)).toBe(false); });
});
describe("Stripe amounts", () => {
  const input = { externalId: "ORD-test", amountMinor: 1280, customerEmail: "test@example.com", customerName: "Test", customerPhone: "+62812345678", items: [{ name: "Shirt", quantity: 2, unitPriceMinor: 640 }], successUrl: "https://example.com/success", cancelUrl: "https://example.com/cancel" };
  it("sends USD cents and a stable gateway idempotency key", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}")); vi.stubGlobal("fetch", fetch);
    await createCheckoutSession(input);
    const request = fetch.mock.calls[0][1];
    expect(request.headers["Idempotency-Key"]).toBe("ORD-test");
    expect(new URLSearchParams(request.body).get("line_items[0][price_data][unit_amount]")).toBe("640");
  });
  it("rejects unconverted or inconsistent items before calling Stripe", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(createCheckoutSession({ ...input, items: [{ name: "Shirt", quantity: 2, unitPriceMinor: 100000 }] })).rejects.toThrow("total");
    expect(fetch).not.toHaveBeenCalled();
  });
});
