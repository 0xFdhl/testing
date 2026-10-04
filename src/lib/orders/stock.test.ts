import { describe, expect, it } from "vitest";
import { addItemsToStock, getRestockLineItems } from "@/lib/orders/stock";

describe("order stock restoration", () => {
  it("restores quantities, including repeated sizes", () => {
    expect(
      addItemsToStock(
        { M: 2, L: 1 },
        [
          { productSlug: "jacket", size: "M", quantity: 2 },
          { productSlug: "jacket", size: "M", quantity: 1 },
          { productSlug: "jacket", size: "XL", quantity: 3 },
        ],
      ),
    ).toEqual({ M: 5, L: 1, XL: 3 });
  });

  it("ignores malformed persisted line items", () => {
    expect(
      getRestockLineItems([
        { productSlug: "jacket", size: "M", quantity: 2 },
        { productSlug: "jacket", size: "L", quantity: -1 },
        { productSlug: "jacket", size: "XL", quantity: 1.5 },
        null,
      ]),
    ).toEqual([{ productSlug: "jacket", size: "M", quantity: 2 }]);
  });
});
