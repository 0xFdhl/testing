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
  await prisma.notificationTemplate.upsert({
    where: { event: "order_created" },
    create: { event: "order_created", enabled: true, title: "🛒 Pesanan Baru Masuk", message: "Order {{order_id}} dari {{customer_name}} — {{total}}, menunggu pembayaran.", sound: "new-order.wav" },
    update: { enabled: true, title: "🛒 Pesanan Baru Masuk", message: "Order {{order_id}} dari {{customer_name}} — {{total}}, menunggu pembayaran.", sound: "new-order.wav" },
  });
  const r1 = await prisma.notificationTemplate.findUnique({ where: { event: "order_created" } });
  console.log("set ->", r1?.enabled, "| updatedAt:", r1?.updatedAt.toISOString());
  await new Promise((res) => setTimeout(res, 3000));
  const r2 = await prisma.notificationTemplate.findUnique({ where: { event: "order_created" } });
  console.log("after 3s ->", r2?.enabled, "| updatedAt:", r2?.updatedAt.toISOString());
  const rows = await prisma.notificationTemplate.findMany({ where: { event: "order_created" } });
  console.log("row count:", rows.length);
}
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });