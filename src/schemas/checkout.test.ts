import { describe, it, expect } from "vitest";
import { checkoutSchema, cartCheckoutSchema } from "@/schemas/checkout";

describe("checkoutSchema", () => {
  const validBase = {
    productSlug: "alpha-jacket",
    size: "M",
    quantity: 1,
    customerName: "Budi",
    customerEmail: "budi@example.com",
    customerPhone: "081234567890",
  };

  it("accepts a valid payload", () => {
    const res = checkoutSchema.safeParse(validBase);
    expect(res.success).toBe(true);
  });

  it("coerces string quantity to number", () => {
    const res = checkoutSchema.safeParse({ ...validBase, quantity: "3" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.quantity).toBe(3);
  });

  it("rejects quantity below 1", () => {
    const res = checkoutSchema.safeParse({ ...validBase, quantity: 0 });
    expect(res.success).toBe(false);
  });

  it("rejects quantity above 10", () => {
    const res = checkoutSchema.safeParse({ ...validBase, quantity: 11 });
    expect(res.success).toBe(false);
  });

  it("validates Indonesian phone formats", () => {
    expect(
      checkoutSchema.safeParse({ ...validBase, customerPhone: "08123456789" })
        .success,
    ).toBe(true);
    expect(
      checkoutSchema.safeParse({ ...validBase, customerPhone: "+628123456789" })
        .success,
    ).toBe(true);
    expect(
      checkoutSchema.safeParse({ ...validBase, customerPhone: "628123456789" })
        .success,
    ).toBe(true);
  });

  it("rejects invalid phone formats", () => {
    expect(
      checkoutSchema.safeParse({ ...validBase, customerPhone: "123456789" })
        .success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...validBase, customerPhone: "08123" }).success,
    ).toBe(false);
  });

  it("rejects invalid email", () => {
    const res = checkoutSchema.safeParse({
      ...validBase,
      customerEmail: "not-an-email",
    });
    expect(res.success).toBe(false);
  });

  it("rejects name too short", () => {
    const res = checkoutSchema.safeParse({ ...validBase, customerName: "A" });
    expect(res.success).toBe(false);
  });
});

describe("cartCheckoutSchema", () => {
  const validBase = {
    items: [{ productSlug: "alpha-jacket", size: "M", quantity: 2 }],
    customerName: "Sari",
    customerEmail: "sari@example.com",
    customerPhone: "081234567890",
  };

  it("accepts a valid payload", () => {
    const res = cartCheckoutSchema.safeParse(validBase);
    expect(res.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const res = cartCheckoutSchema.safeParse({ ...validBase, items: [] });
    expect(res.success).toBe(false);
  });

  it("rejects more than 20 items", () => {
    const items = Array.from({ length: 21 }, () => ({
      productSlug: "a",
      size: "M",
      quantity: 1,
    }));
    const res = cartCheckoutSchema.safeParse({ ...validBase, items });
    expect(res.success).toBe(false);
  });

  it("rejects quantity above 10 per item", () => {
    const res = cartCheckoutSchema.safeParse({
      ...validBase,
      items: [{ productSlug: "a", size: "M", quantity: 11 }],
    });
    expect(res.success).toBe(false);
  });
});