import { describe, it, expect } from "vitest";
import { formatIdr } from "@/lib/format";

describe("formatIdr", () => {
  it("formats a basic integer with thousands separator", () => {
    expect(formatIdr(1500000)).toBe("Rp.1.500.000");
  });

  it("formats zero", () => {
    expect(formatIdr(0)).toBe("Rp.0");
  });

  it("formats a small number without separators", () => {
    expect(formatIdr(500)).toBe("Rp.500");
  });

  it("uses id-ID locale (dot as thousand separator)", () => {
    expect(formatIdr(250000)).toBe("Rp.250.000");
  });
});