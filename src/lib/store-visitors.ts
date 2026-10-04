import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

type MonthlyVisitorRow = {
  month: string;
  count: bigint;
};

export async function getMonthlyVisitorCounts(fromMonth: string) {
  const rows = await prisma.$queryRaw<MonthlyVisitorRow[]>`
    SELECT "month", COUNT(*)::bigint AS "count"
    FROM "StoreVisitorMonth"
    WHERE "month" >= ${fromMonth}
    GROUP BY "month"
    ORDER BY "month"
  `;

  return rows.map((row) => ({
    month: row.month,
    count: Number(row.count),
  }));
}

export async function recordMonthlyVisitor(visitorId: string, month: string) {
  await prisma.$executeRaw`
    INSERT INTO "StoreVisitorMonth"
      ("id", "visitorId", "month", "createdAt", "lastSeenAt")
    VALUES
      (${randomUUID()}, ${visitorId}, ${month}, NOW(), NOW())
    ON CONFLICT ("visitorId", "month")
    DO UPDATE SET "lastSeenAt" = NOW()
  `;
}
