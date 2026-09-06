import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });
if (process.env.SIM_ENV_FILE) config({ path: process.env.SIM_ENV_FILE, override: true });
import webpush from "web-push";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "" }),
});
async function main() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "",
    process.env.VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? "",
  );
  const all = await prisma.notificationSubscription.findMany({ where: { adminId: { not: null } }, orderBy: { createdAt: "desc" } });
  const subs = process.env.TARGET_NEWEST === "1" && all.length > 0 ? [all[0]] : all;
  for (const s of subs) {
    const t = new URL(s.endpoint);
    console.log("endpoint host:", t.host, "| ua:", s.userAgent?.slice(0, 40), "| createdAt:", s.createdAt.toISOString());
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: "test", body: "test", url: "/admin/orders", orderId: null }),
      );
      console.log("  -> OK");
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      console.log("  -> FAIL statusCode:", err.statusCode, "| msg:", err.message?.slice(0, 200));
    }
  }
}
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });