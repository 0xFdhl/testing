export type RestockLineItem = {
  productSlug: string;
  size: string;
  quantity: number;
};

export function getRestockLineItems(value: unknown): RestockLineItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.productSlug !== "string" ||
      typeof candidate.size !== "string" ||
      typeof candidate.quantity !== "number" ||
      !Number.isInteger(candidate.quantity) ||
      candidate.quantity <= 0
    ) {
      return [];
    }
    return [
      {
        productSlug: candidate.productSlug,
        size: candidate.size,
        quantity: candidate.quantity,
      },
    ];
  });
}

export function addItemsToStock(
  currentStock: Record<string, number>,
  items: RestockLineItem[],
) {
  const nextStock = { ...currentStock };
  for (const item of items) {
    nextStock[item.size] = (nextStock[item.size] ?? 0) + item.quantity;
  }
  return nextStock;
}
