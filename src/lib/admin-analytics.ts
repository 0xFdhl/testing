const PRODUCT_COLORS = [
  "#c4a574",
  "#8b5cf6",
  "#38bdf8",
  "#34d399",
  "#fb7185",
  "#71717a",
];

type SalesLineItem = {
  productSlug?: string;
  productName?: string;
  quantity?: number;
};

export type SalesOrder = {
  createdAt: Date;
  paidAt: Date | null;
  lineItems: unknown;
};

export type ProductSeries = {
  key: string;
  name: string;
  total: number;
  color: string;
};

export type MonthlyProductSales = {
  month: string;
  label: string;
  totalItems: number;
  [key: string]: string | number;
};

export type MonthlyCommerceTrend = MonthlyProductSales & {
  visitors: number;
  checkouts: number;
};

function getLineItems(value: unknown): SalesLineItem[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is SalesLineItem =>
      typeof item === "object" && item !== null,
  );
}

export function buildMonthlyProductSales(
  orders: SalesOrder[],
  now: Date,
  monthCount = 12,
) {
  const buckets = new Map<string, Map<string, number>>();
  const monthDates = getStoreMonthDates(now, monthCount);
  const productTotals = new Map<string, number>();

  for (const date of monthDates) {
    buckets.set(getMonthKey(date), new Map());
  }

  for (const order of orders) {
    const date = order.paidAt ?? order.createdAt;
    const bucket = buckets.get(getMonthKey(date));
    if (!bucket) continue;

    for (const item of getLineItems(order.lineItems)) {
      const productName = item.productName?.trim() || item.productSlug?.trim();
      const quantity = Number(item.quantity);
      if (!productName || !Number.isFinite(quantity) || quantity <= 0) continue;

      bucket.set(productName, (bucket.get(productName) ?? 0) + quantity);
      productTotals.set(
        productName,
        (productTotals.get(productName) ?? 0) + quantity,
      );
    }
  }

  const rankedProducts = [...productTotals.entries()].sort(
    ([nameA, totalA], [nameB, totalB]) =>
      totalB - totalA || nameA.localeCompare(nameB),
  );
  const visibleProducts = rankedProducts.slice(0, 5);
  const hiddenProductNames = new Set(rankedProducts.slice(5).map(([name]) => name));
  const hasOtherProducts = hiddenProductNames.size > 0;

  const products: ProductSeries[] = visibleProducts.map(([name, total], index) => ({
    key: `product_${index}`,
    name,
    total,
    color: PRODUCT_COLORS[index],
  }));

  if (hasOtherProducts) {
    products.push({
      key: "other",
      name: "Other products",
      total: rankedProducts
        .slice(5)
        .reduce((sum, [, quantity]) => sum + quantity, 0),
      color: PRODUCT_COLORS[5],
    });
  }

  const data: MonthlyProductSales[] = monthDates.map((date) => {
    const sales = buckets.get(getMonthKey(date)) ?? new Map<string, number>();
    const row: MonthlyProductSales = {
      month: getMonthKey(date),
      label: new Intl.DateTimeFormat("id-ID", {
        timeZone: STORE_TIME_ZONE,
        month: "short",
        year: "2-digit",
      }).format(date),
      totalItems: 0,
    };

    visibleProducts.forEach(([name], index) => {
      const quantity = sales.get(name) ?? 0;
      row[`product_${index}`] = quantity;
      row.totalItems += quantity;
    });

    if (hasOtherProducts) {
      const otherQuantity = [...sales.entries()].reduce(
        (sum, [name, quantity]) =>
          sum + (hiddenProductNames.has(name) ? quantity : 0),
        0,
      );
      row.other = otherQuantity;
      row.totalItems += otherQuantity;
    }

    return row;
  });

  return {
    data,
    products,
    totalItemsSold: rankedProducts.reduce((sum, [, total]) => sum + total, 0),
    topProduct: rankedProducts[0]
      ? { name: rankedProducts[0][0], total: rankedProducts[0][1] }
      : null,
  };
}

export function buildMonthlyCommerceTrend(
  productSales: MonthlyProductSales[],
  checkoutDates: Date[],
  visitorCounts: Array<{ month: string; count: number }>,
): MonthlyCommerceTrend[] {
  const checkoutsByMonth = new Map<string, number>();
  const visitorsByMonth = new Map(
    visitorCounts.map(({ month, count }) => [month, count]),
  );

  for (const date of checkoutDates) {
    const key = getMonthKey(date);
    checkoutsByMonth.set(key, (checkoutsByMonth.get(key) ?? 0) + 1);
  }

  return productSales.map((row) => ({
    ...row,
    visitors: visitorsByMonth.get(row.month) ?? 0,
    checkouts: checkoutsByMonth.get(row.month) ?? 0,
  }));
}
import { getMonthKey, getStoreMonthDates, STORE_TIME_ZONE } from "@/lib/store-time";
