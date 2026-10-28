import { describe, expect, it } from "vitest";
import { assertPaymentMatches, type PaymentEvidence, type PaymentExpectation } from "./verification";
const order: PaymentExpectation = { externalId: "ORD-1", gatewayInvoiceId: "inv-1", provider: "xendit", currency: "IDR", paymentAmount: 100000, paymentLive: false };
const evidence: PaymentEvidence = { externalId: "ORD-1", invoiceId: "inv-1", provider: "xendit", currency: "IDR", amount: 100000, live: false, status: "PAID" };
describe("payment binding", () => {
  it("accepts exact evidence", () => expect(() => assertPaymentMatches(order, evidence)).not.toThrow());
  it.each([{ invoiceId: "other" }, { externalId: "other" }, { provider: "stripe" as const }, { currency: "USD" }, { amount: 1 }, { live: true }])("rejects mismatched evidence %j", (patch) => expect(() => assertPaymentMatches(order, { ...evidence, ...patch })).toThrow());
  it("does not infer a legacy payment snapshot", () => expect(() => assertPaymentMatches({ ...order, paymentAmount: null }, evidence)).toThrow("snapshot missing"));
});
