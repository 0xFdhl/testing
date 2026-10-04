/**
 * Seed idempotent dashboard demo data for the latest six months.
 * Run intentionally with: npm run simulate:dashboard -- --apply
 */
import "dotenv/config";
import { resolve } from "path";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: resolve(__dirname, "../.env.local"), override: true });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const visitorTargets = [900, 1150, 1480, 1820, 2250, 2700];
const checkoutTargets = [28, 38, 52, 71, 96, 128];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function main() {
  if (!process.argv.includes("--apply")) {
    throw new Error(
      "Simulation not applied. Re-run with: npm run simulate:dashboard -- --apply",
    );
  }
  if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is required");

  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  if (products.length === 0) throw new Error("Seed products before running simulation");

  const now = new Date();
  const summary: Array<{
    month: string;
    visitors: number;
    successfulCheckouts: number;
    allCheckoutAttempts: number;
  }> = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const targetIndex = 5 - offset;
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = monthKey(monthDate);
    const visitors = visitorTargets[targetIndex];
    const paidCheckouts = checkoutTargets[targetIndex];

    const visitorRows = Array.from({ length: visitors }, (_, index) => ({
      visitorId: `simulation-${key}-${String(index + 1).padStart(5, "0")}`,
      month: key,
      createdAt: new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1 + (index % 25),
        index % 24,
      ),
    }));
    for (const rows of chunk(visitorRows, 500)) {
      await prisma.storeVisitorMonth.createMany({ data: rows, skipDuplicates: true });
    }

    const maxDay =
      offset === 0
        ? Math.max(1, now.getDate())
        : new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const orderRows = Array.from({ length: paidCheckouts }, (_, index) => {
      const product = products[index % products.length];
      const sizes = Array.isArray(product.sizes) ? (product.sizes as string[]) : [];
      const quantity = 1 + (index % 3);
      const createdAt = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1 + ((index * 7) % maxDay),
        8 + (index % 12),
      );

      return {
        externalId: `ORD-SIM-ANALYTICS-${key}-${String(index + 1).padStart(4, "0")}`,
        status: "PAID" as const,
        lineItems: [
          {
            productSlug: product.slug,
            productName: product.name,
            size: sizes[index % Math.max(1, sizes.length)] ?? "M",
            quantity,
            unitPrice: product.price,
          },
        ],
        amount: product.price * quantity,
        customerName: `Simulation Customer ${index + 1}`,
        customerEmail: `simulation-${key}-${index + 1}@example.test`,
        customerPhone: "081200000000",
        createdAt,
        paidAt: new Date(createdAt.getTime() + 15 * 60_000),
      };
    });
    await prisma.order.createMany({ data: orderRows, skipDuplicates: true });

    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    const [actualVisitors, successfulCheckouts, allCheckoutAttempts] =
      await Promise.all([
        prisma.storeVisitorMonth.count({ where: { month: key } }),
        prisma.order.count({
          where: {
            status: "PAID",
            paidAt: { gte: monthDate, lt: nextMonth },
          },
        }),
        prisma.order.count({
          where: { createdAt: { gte: monthDate, lt: nextMonth } },
        }),
      ]);

    summary.push({
      month: key,
      visitors: actualVisitors,
      successfulCheckouts,
      allCheckoutAttempts,
    });
  }

  console.table(summary);
  console.log("Dashboard simulation is ready. Re-running is safe and will skip duplicates.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
