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
  const rows = await prisma.notificationSubscription.findMany({ orderBy: { createdAt: "desc" } });
  for (const r of rows) {
    console.log("=== sub", r.id.slice(0, 8), "| created:", r.createdAt.toISOString());
    console.log("UA:", r.userAgent ?? "(none)");
    console.log("endpoint:", r.endpoint.slice(0, 70) + "...");
  }
}
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });