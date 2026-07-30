import { describe, it, expect } from "vitest";
import { createPaymentSchema } from "@/schemas/payment";

const validBase = {
  externalId: "ORD-abc-123",
  amount: 1500000,
  description: "Order #123",
  payerEmail: "buyer@example.com",
  customer: {
    given_names: "Budi",
    email: "buyer@example.com",
    mobile_number: "081234567890",
  },
  items: [{ name: "Alpha Jacket — M", quantity: 1, price: 1500000 }],
  successRedirectUrl: "https://example.com/checkout/success?order=ORD-abc-123",
  failureRedirectUrl: "https://example.com/checkout?failed=1",
};

describe("createPaymentSchema", () => {
  it("accepts a valid payload", () => {
    expect(createPaymentSchema.safeParse(validBase).success).toBe(true);
  });

  it("rejects externalId with invalid characters", () => {
    expect(
      createPaymentSchema.safeParse({
        ...validBase,
        externalId: "ORD abc!",
      }).success,
    ).toBe(false);
  });

  it("rejects amount below 1", () => {
    expect(
      createPaymentSchema.safeParse({ ...validBase, amount: 0 }).success,
    ).toBe(false);
  });

  it("rejects quantity 0", () => {
    const items = [{ name: "Item", quantity: 0, price: 1000 }];
    expect(
      createPaymentSchema.safeParse({ ...validBase, items }).success,
    ).toBe(false);
  });

  it("rejects price below 1", () => {
    const items = [{ name: "Item", quantity: 1, price: 0 }];
    expect(
      createPaymentSchema.safeParse({ ...validBase, items }).success,
    ).toBe(false);
  });

  it("accepts optional invoiceDurationSeconds in range", () => {
    expect(
      createPaymentSchema.safeParse({ ...validBase, invoiceDurationSeconds: 600 })
        .success,
    ).toBe(true);
  });

  it("rejects invoiceDurationSeconds below 300", () => {
    expect(
      createPaymentSchema.safeParse({ ...validBase, invoiceDurationSeconds: 299 })
        .success,
    ).toBe(false);
  });

  it("rejects invalid redirect URLs", () => {
    expect(
      createPaymentSchema.safeParse({ ...validBase, successRedirectUrl: "nope" })
        .success,
    ).toBe(false);
  });
});