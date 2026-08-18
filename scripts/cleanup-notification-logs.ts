import "dotenv/config";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env.local"), override: true });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const retentionDays = Number(
    process.env.NOTIFICATION_LOG_RETENTION_DAYS ?? "90",
  );
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error(
      "NOTIFICATION_LOG_RETENTION_DAYS must be a positive number",
    );
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 3600 * 1000);

  const result = await prisma.notificationLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  console.log(
    `Deleted ${result.count} notification log(s) older than ${retentionDays} day(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
