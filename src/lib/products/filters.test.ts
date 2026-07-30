import { describe, it, expect } from "vitest";
import {
  normalizeSearchQuery,
  isSizeAvailable,
  MAX_SEARCH_QUERY_LENGTH,
  productMatchesShopFilter,
  isValidShopFilterCategory,
} from "@/lib/products";
import type { Product } from "@/lib/products";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "alpha-jacket",
    name: "Alpha Jacket",
    category: "jacket",
    sizes: ["M", "L", "XL"],
    image: "/images/products/alpha.webp",
    price: 1_200_000,
    ...overrides,
  };
}

describe("normalizeSearchQuery", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeSearchQuery("  hello  ")).toBe("hello");
  });

  it("caps to MAX_SEARCH_QUERY_LENGTH", () => {
    const long = "a".repeat(MAX_SEARCH_QUERY_LENGTH + 50);
    expect(normalizeSearchQuery(long).length).toBe(MAX_SEARCH_QUERY_LENGTH);
  });

  it("returns empty for whitespace-only input", () => {
    expect(normalizeSearchQuery("    ")).toBe("");
  });
});

describe("isSizeAvailable", () => {
  it("returns true for sizes in product.sizes", () => {
    const p = makeProduct();
    expect(isSizeAvailable(p, "M")).toBe(true);
    expect(isSizeAvailable(p, "XL")).toBe(true);
  });

  it("returns false for sizes not in product.sizes", () => {
    const p = makeProduct();
    expect(isSizeAvailable(p, "S")).toBe(false);
  });

  it("always returns true for XS and S when CUSTOM ORDER badge", () => {
    const p = makeProduct({ badge: "CUSTOM ORDER" });
    expect(isSizeAvailable(p, "XS")).toBe(true);
    expect(isSizeAvailable(p, "S")).toBe(true);
  });

  it("returns false for XS/S even if listed (per business rule)", () => {
    const p = makeProduct({ sizes: ["M", "L", "XL"] });
    expect(isSizeAvailable(p, "XS")).toBe(false);
    expect(isSizeAvailable(p, "S")).toBe(false);
  });
});

describe("productMatchesShopFilter", () => {
  it("matches everything when filter is 'all'", () => {
    expect(productMatchesShopFilter(makeProduct({ category: "jacket" }), "all")).toBe(true);
    expect(productMatchesShopFilter(makeProduct({ category: "snowboard" }), "all")).toBe(true);
  });

  it("matches exact category", () => {
    expect(productMatchesShopFilter(makeProduct({ category: "ski" }), "ski")).toBe(true);
    expect(productMatchesShopFilter(makeProduct({ category: "ski" }), "jacket")).toBe(false);
  });
});

describe("isValidShopFilterCategory", () => {
  it("accepts known values including 'all'", () => {
    expect(isValidShopFilterCategory("all")).toBe(true);
    expect(isValidShopFilterCategory("jacket")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isValidShopFilterCategory("boots")).toBe(false);
    expect(isValidShopFilterCategory(undefined)).toBe(false);
  });
});