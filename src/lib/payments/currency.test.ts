import { describe, it, expect, beforeEach } from "vitest";
import { idrToUsdCents, setRate, resetRate, getRate } from "./currency";

describe("idrToUsdCents", () => {
  beforeEach(() => {
    resetRate();
  });

  it("converts IDR to USD cents using default rate", () => {
    // default rate 0.000064 → 100000 IDR = 640 USD cents
    expect(idrToUsdCents(100000)).toBe(640);
  });

  it("returns 0 for 0 IDR", () => {
    expect(idrToUsdCents(0)).toBe(0);
  });

  it("rounds to nearest cent", () => {
    // 15000 * 0.000064 * 100 = 96 cents
    expect(idrToUsdCents(15000)).toBe(96);
  });

  it("throws for negative amounts", () => {
    expect(() => idrToUsdCents(-1)).toThrow("invalid amount");
  });

  it("throws for non-finite amounts", () => {
    expect(() => idrToUsdCents(Infinity)).toThrow("invalid amount");
    expect(() => idrToUsdCents(NaN)).toThrow("invalid amount");
  });

  it("uses overridden rate", () => {
    setRate(0.0001);
    expect(idrToUsdCents(10000)).toBe(100); // 10000 * 0.0001 * 100 = 100
  });

  it("reports current rate", () => {
    expect(getRate()).toBeCloseTo(0.000064);
    setRate(0.00005);
    expect(getRate()).toBeCloseTo(0.00005);
  });
});
