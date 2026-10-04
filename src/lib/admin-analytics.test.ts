import { describe, expect, it } from "vitest";
import {
  buildMonthlyCommerceTrend,
  buildMonthlyProductSales,
} from "@/lib/admin-analytics";

describe("buildMonthlyProductSales", () => {
  const now = new Date(2026, 8, 26);

  it("groups paid line-item quantities by product and month", () => {
    const result = buildMonthlyProductSales(
      [
        {
          createdAt: new Date(2026, 7, 10),
          paidAt: new Date(2026, 7, 11),
          lineItems: [
            { productName: "Jacket", quantity: 2 },
            { productName: "Boots", quantity: 1 },
          ],
        },
        {
          createdAt: new Date(2026, 8, 2),
          paidAt: new Date(2026, 8, 2),
          lineItems: [{ productName: "Jacket", quantity: 3 }],
        },
      ],
      now,
      2,
    );

    expect(result.products.map((product) => [product.name, product.total])).toEqual([
      ["Jacket", 5],
      ["Boots", 1],
    ]);
    expect(result.data.map(({ month, totalItems }) => [month, totalItems])).toEqual([
      ["2026-08", 3],
      ["2026-09", 3],
    ]);
    expect(result.totalItemsSold).toBe(6);
    expect(result.topProduct).toEqual({ name: "Jacket", total: 5 });
  });

  it("ignores invalid items and groups products outside the top five", () => {
    const lineItems = [
      ...Array.from({ length: 6 }, (_, index) => ({
        productName: `Product ${index + 1}`,
        quantity: 6 - index,
      })),
      { productName: "Invalid", quantity: 0 },
    ];

    const result = buildMonthlyProductSales(
      [{ createdAt: now, paidAt: null, lineItems }],
      now,
      1,
    );

    expect(result.products).toHaveLength(6);
    expect(result.products.at(-1)).toMatchObject({
      key: "other",
      name: "Other products",
      total: 1,
    });
    expect(result.data[0].other).toBe(1);
    expect(result.totalItemsSold).toBe(21);
  });
});

describe("buildMonthlyCommerceTrend", () => {
  it("combines visitors, checkout attempts, and sold items by month", () => {
    const sales = buildMonthlyProductSales(
      [
        {
          createdAt: new Date(2026, 8, 8),
          paidAt: new Date(2026, 8, 8),
          lineItems: [{ productName: "Jacket", quantity: 2 }],
        },
      ],
      new Date(2026, 8, 26),
      2,
    );

    const trend = buildMonthlyCommerceTrend(
      sales.data,
      [new Date(2026, 7, 3), new Date(2026, 8, 2), new Date(2026, 8, 4)],
      [
        { month: "2026-08", count: 10 },
        { month: "2026-09", count: 14 },
      ],
    );

    expect(
      trend.map(({ month, visitors, checkouts, totalItems }) => ({
        month,
        visitors,
        checkouts,
        totalItems,
      })),
    ).toEqual([
      { month: "2026-08", visitors: 10, checkouts: 1, totalItems: 0 },
      { month: "2026-09", visitors: 14, checkouts: 2, totalItems: 2 },
    ]);
  });
});
