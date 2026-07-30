import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { verifyWebhookToken, isPaidStatus, createInvoice, getInvoice } from "@/lib/xendit/client";

describe("isPaidStatus", () => {
  it("true for PAID and SETTLED", () => {
    expect(isPaidStatus("PAID")).toBe(true);
    expect(isPaidStatus("SETTLED")).toBe(true);
  });

  it("false for PENDING and EXPIRED", () => {
    expect(isPaidStatus("PENDING")).toBe(false);
    expect(isPaidStatus("EXPIRED")).toBe(false);
  });
});

describe("verifyWebhookToken", () => {
  beforeEach(() => {
    vi.stubEnv("XENDIT_MODE", "test");
    vi.stubEnv("XENDIT_TEST_WEBHOOK_TOKEN", "secret-token-123");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("accepts matching token", () => {
    const req = new Request("https://example.com", {
      headers: { "x-callback-token": "secret-token-123" },
    });
    expect(verifyWebhookToken(req)).toBe(true);
  });

  it("rejects missing header", () => {
    const req = new Request("https://example.com");
    expect(verifyWebhookToken(req)).toBe(false);
  });

  it("rejects wrong token", () => {
    const req = new Request("https://example.com", {
      headers: { "x-callback-token": "wrong-token" },
    });
    expect(verifyWebhookToken(req)).toBe(false);
  });

  it("rejects when token not configured", () => {
    vi.stubEnv("XENDIT_TEST_WEBHOOK_TOKEN", "");
    const req = new Request("https://example.com", {
      headers: { "x-callback-token": "secret-token-123" },
    });
    expect(verifyWebhookToken(req)).toBe(false);
  });
});

describe("createInvoice / getInvoice (fetch mock)", () => {
  beforeEach(() => {
    vi.stubEnv("XENDIT_MODE", "test");
    vi.stubEnv("XENDIT_TEST_SECRET_KEY", "xnd_test_secret");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("createInvoice posts and returns invoice JSON", async () => {
    const mockInvoice = {
      id: "inv-1",
      external_id: "ORD-1",
      status: "PENDING",
      amount: 1500000,
      invoice_url: "https://xendit.co/inv/1",
      expiry_date: "2026-01-01T00:00:00Z",
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(mockInvoice), { status: 200 }));

    const result = await createInvoice({
      externalId: "ORD-1",
      amount: 1500000,
      payerEmail: "b@x.com",
      description: "test",
      customer: { given_names: "B", email: "b@x.com" },
      items: [{ name: "Item", quantity: 1, price: 1500000 }],
      successRedirectUrl: "https://example.com/success",
      failureRedirectUrl: "https://example.com/fail",
    });

    expect(result.id).toBe("inv-1");
    expect(fetchSpy).toHaveBeenCalledOnce();
    const call = fetchSpy.mock.calls[0];
    expect(call[0]).toContain("/v2/invoices");
    const opts = call[1] as RequestInit;
    expect(opts.method).toBe("POST");
    const headers = opts.headers as Record<string, string>;
    expect(headers["Authorization"]).toContain("Basic");
  });

  it("createInvoice throws XenditError on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("bad request", { status: 400 }),
    );
    await expect(
      createInvoice({
        externalId: "ORD-x",
        amount: 1,
        payerEmail: "b@x.com",
        description: "x",
        customer: { given_names: "B", email: "b@x.com" },
        items: [{ name: "I", quantity: 1, price: 1 }],
        successRedirectUrl: "https://example.com/success",
        failureRedirectUrl: "https://example.com/fail",
      }),
    ).rejects.toThrow(/Xendit API 400/);
  });

  it("getInvoice issues GET to /v2/invoices/:id", async () => {
    const mockInvoice = {
      id: "inv-5",
      external_id: "ORD-5",
      status: "PAID",
      amount: 1000,
      invoice_url: "url",
      expiry_date: "2026-01-01T00:00:00Z",
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(mockInvoice), { status: 200 }));

    const result = await getInvoice("inv-5");
    expect(result.status).toBe("PAID");
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("/v2/invoices/inv-5");
  });
});