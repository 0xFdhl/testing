import { describe, it, expect, afterEach } from "vitest";
import { isStripeTestMode } from "./config";

describe("isStripeTestMode", () => {
  const origKey = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = origKey;
  });

  it("returns true for sk_test_ prefix", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc123";
    expect(isStripeTestMode()).toBe(true);
  });

  it("returns false for sk_live_ prefix", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc123";
    expect(isStripeTestMode()).toBe(false);
  });
});
