import { describe, it, expect, beforeEach } from "vitest";
import {
  checkIdempotency,
  rememberIdempotency,
  clearIdempotency,
  deriveCheckoutKey,
  deriveCartCheckoutKey,
} from "@/lib/idempotency";

describe("idempotency", () => {
  describe("checkIdempotency / rememberIdempotency", () => {
    beforeEach(() => {
      clearIdempotency("k1");
      clearIdempotency("k2");
    });

    it("returns miss when nothing remembered", () => {
      expect(checkIdempotency("k1")).toEqual({ hit: false });
    });

    it("returns hit with cached result after remember", () => {
      rememberIdempotency("k1", { ok: true, redirectUrl: "/x" });
      const res = checkIdempotency<{ ok: boolean; redirectUrl: string }>("k1");
      expect(res.hit).toBe(true);
      if (res.hit) expect(res.result).toEqual({ ok: true, redirectUrl: "/x" });
    });

    it("clearIdempotency removes entry", () => {
      rememberIdempotency("k2", 42);
      clearIdempotency("k2");
      expect(checkIdempotency("k2")).toEqual({ hit: false });
    });
  });

  describe("deriveCheckoutKey", () => {
    it("is deterministic for identical intent", () => {
      const a = deriveCheckoutKey("u1", {
        productSlug: "goggles",
        size: "M",
        quantity: 2,
        customerEmail: "a@b.com",
      });
      const b = deriveCheckoutKey("u1", {
        productSlug: "goggles",
        size: "M",
        quantity: 2,
        customerEmail: "a@b.com",
      });
      expect(a).toBe(b);
      expect(a.startsWith("checkout:")).toBe(true);
    });

    it("differs across users / intent", () => {
      const a = deriveCheckoutKey("u1", {
        productSlug: "goggles",
        size: "M",
        quantity: 2,
        customerEmail: "a@b.com",
      });
      const b = deriveCheckoutKey("u2", {
        productSlug: "goggles",
        size: "M",
        quantity: 2,
        customerEmail: "a@b.com",
      });
      const c = deriveCheckoutKey("u1", {
        productSlug: "goggles",
        size: "L",
        quantity: 2,
        customerEmail: "a@b.com",
      });
      expect(a).not.toBe(b);
      expect(a).not.toBe(c);
    });
  });

  describe("deriveCartCheckoutKey", () => {
    it("is deterministic for identical cart intent", () => {
      const items = [
        { productSlug: "a", size: "M", quantity: 1 },
        { productSlug: "b", size: "L", quantity: 2 },
      ];
      const a = deriveCartCheckoutKey("u1", { items, customerEmail: "x@y.com" });
      const b = deriveCartCheckoutKey("u1", { items, customerEmail: "x@y.com" });
      expect(a).toBe(b);
      expect(a.startsWith("checkout:cart:")).toBe(true);
    });

    it("differs when item order changes effectively", () => {
      const a = deriveCartCheckoutKey("u1", {
        items: [
          { productSlug: "a", size: "M", quantity: 1 },
          { productSlug: "b", size: "L", quantity: 2 },
        ],
        customerEmail: "x@y.com",
      });
      const b = deriveCartCheckoutKey("u1", {
        items: [
          { productSlug: "b", size: "L", quantity: 2 },
          { productSlug: "a", size: "M", quantity: 1 },
        ],
        customerEmail: "x@y.com",
      });
      // Item order is part of signature → different keys (dedup only identical sequence)
      expect(a).not.toBe(b);
    });
  });
});