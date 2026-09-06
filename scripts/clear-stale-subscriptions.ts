import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });
if (process.env.SIM_ENV_FILE) config({ path: process.env.SIM_ENV_FILE, override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "" }),
});
async function main() {
  const result = await prisma.notificationSubscription.deleteMany({
    where: { adminId: { not: null } },
  });
  console.log(`Deleted ${result.count} stale admin subscription(s).`);
  const left = await prisma.notificationSubscription.count();
  console.log(`Remaining subscriptions (all types): ${left}`);
}
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });