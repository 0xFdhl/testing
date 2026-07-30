import { describe, it, expect } from "vitest";
import {
  loginSchema,
  productFormSchema,
  orderStatusSchema,
  updateOrderStatusSchema,
  settingsSchema,
} from "@/schemas/admin";

describe("loginSchema", () => {
  it("accepts valid email + password", () => {
    expect(
      loginSchema.safeParse({
        email: "admin@yourbrand.com",
        password: "secret",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(
      loginSchema.safeParse({ email: "nope", password: "secret" }).success,
    ).toBe(false);
  });

  it("rejects empty password", () => {
    expect(
      loginSchema.safeParse({ email: "admin@yourbrand.com", password: "" })
        .success,
    ).toBe(false);
  });
});

describe("productFormSchema", () => {
  const validBase = {
    name: "Alpha Jacket",
    slug: "alpha-jacket",
    description: "Warm jacket",
    category: "jacket",
    price: 1200000,
    images: ["https://example.com/img.jpg"],
    stock: { M: 10, L: 5, XL: 0 },
    sizingInfo: [],
    shippingInfo: [],
    returnsInfo: [],
  };

  it("accepts a valid product", () => {
    expect(productFormSchema.safeParse(validBase).success).toBe(true);
  });

  it("coerces string price to number", () => {
    expect(
      productFormSchema.safeParse({ ...validBase, price: "150000" }).success,
    ).toBe(true);
  });

  it("rejects negative price", () => {
    expect(
      productFormSchema.safeParse({ ...validBase, price: -1 }).success,
    ).toBe(false);
  });

  it("rejects slug with uppercase or spaces", () => {
    expect(
      productFormSchema.safeParse({ ...validBase, slug: "Alpha Jacket" })
        .success,
    ).toBe(false);
  });

  it("rejects unknown category", () => {
    expect(
      productFormSchema.safeParse({ ...validBase, category: "boots" }).success,
    ).toBe(false);
  });

  it("requires at least one image", () => {
    expect(
      productFormSchema.safeParse({ ...validBase, images: [] }).success,
    ).toBe(false);
  });

  it("rejects negative stock", () => {
    expect(
      productFormSchema.safeParse({ ...validBase, stock: { M: -1 } }).success,
    ).toBe(false);
  });
});

describe("orderStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const s of ["PENDING", "PAID", "EXPIRED", "CANCELLED"]) {
      expect(orderStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it("rejects unknown status", () => {
    expect(orderStatusSchema.safeParse("REFUNDED").success).toBe(false);
  });
});

describe("updateOrderStatusSchema", () => {
  it("accepts externalId + valid status", () => {
    expect(
      updateOrderStatusSchema.safeParse({
        externalId: "ORD-abc",
        status: "PAID",
      }).success,
    ).toBe(true);
  });

  it("rejects empty externalId", () => {
    expect(
      updateOrderStatusSchema.safeParse({
        externalId: "",
        status: "PAID",
      }).success,
    ).toBe(false);
  });
});

describe("settingsSchema", () => {
  it("accepts valid settings", () => {
    expect(
      settingsSchema.safeParse({
        xenditMode: "test",
        appUrl: "https://example.com",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown xendit mode", () => {
    expect(
      settingsSchema.safeParse({
        xenditMode: "sandbox",
        appUrl: "https://example.com",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid url", () => {
    expect(
      settingsSchema.safeParse({ xenditMode: "live", appUrl: "not-a-url" })
        .success,
    ).toBe(false);
  });
});