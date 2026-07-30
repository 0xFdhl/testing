import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  const key = "test-key";

  beforeEach(() => {
    // Use a fresh key per test to avoid cross-test interference from the shared
    // in-memory store, plus flush pending timers so setInterval cleanup doesn't run.
    vi.useFakeTimers();
  });

  it("allows first request", () => {
    const result = checkRateLimit(`${key}-first`, 5, 1000);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });

  it("blocks after limit is reached", () => {
    const k = `${key}-block`;
    for (let i = 0; i < 5; i++) checkRateLimit(k, 5, 1000);
    const blocked = checkRateLimit(k, 5, 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window expires", () => {
    const k = `${key}-reset`;
    for (let i = 0; i < 3; i++) checkRateLimit(k, 3, 1000);
    expect(checkRateLimit(k, 3, 1000).allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    const after = checkRateLimit(k, 3, 1000);
    expect(after.allowed).toBe(true);
    expect(after.retryAfterMs).toBe(0);
  });

  it("isolates keys", () => {
    checkRateLimit(`${key}-a`, 1, 1000);
    expect(checkRateLimit(`${key}-a`, 1, 1000).allowed).toBe(false);
    expect(checkRateLimit(`${key}-b`, 1, 1000).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("reads x-forwarded-for (first entry)", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.5, 198.51.100.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("trims whitespace from x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "  203.0.113.5  " },
    });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "198.51.100.7" },
    });
    expect(getClientIp(req)).toBe("198.51.100.7");
  });

  it("returns unknown when no header present", () => {
    const req = new Request("https://example.com");
    expect(getClientIp(req)).toBe("unknown");
  });
});