/**
 * Spam test push admin — bikin N order fake + kirim push order_created
 * ke semua subscription admin, persis jalur yang dipakai checkout asli.
 * Set COUNT untuk jumlah (default 120).
 */
import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });
if (process.env.SIM_ENV_FILE) config({ path: process.env.SIM_ENV_FILE, override: true });

import webpush from "web-push";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_TEMPLATES, renderTemplate } from "../src/lib/notifications/templates";
import { formatIdr } from "../src/lib/format";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const COUNT = Math.min(Math.max(Number(process.env.COUNT ?? "120"), 1), 500);
const EVENT = "order_created" as const;
const FAKE_NAME = "Test User (SIMULASI)";
const FAKE_EMAIL = "simulasi.user@example.com";
const FAKE_PHONE = "081298765432";
const FAKE_AMOUNT = 150_000;
const BATCH = 20;

async function main() {
  const allSubs = await prisma.notificationSubscription.findMany({
    where: { adminId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  const subs = process.env.TARGET_NEWEST === "1" && allSubs.length > 0 ? [allSubs[0]] : allSubs;
  console.log(`Admin subscriptions: ${allSubs.length} | target (${process.env.TARGET_NEWEST === "1" ? "newest only" : "all"}): ${subs.length} | push count: ${COUNT}`);
  if (subs.length === 0) {
    throw new Error("Belum ada subscription admin. Aktifkan notifikasi di /admin dulu.");
  }

  const row = await prisma.notificationTemplate.findUnique({ where: { event: EVENT } });
  const fallback = DEFAULT_TEMPLATES[EVENT];
  const enabled = row?.enabled ?? true;
  const title = row?.title ?? fallback.title;
  const message = row?.message ?? fallback.message;
  const sound = row?.sound ?? fallback.sound ?? null;
  if (!enabled) throw new Error(`Template ${EVENT} non-aktif — push tidak dikirim.`);

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error("VAPID keys belum diisi di env.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  let sent = 0;
  let failed = 0;
  const stale = new Set<string>();

  for (let i = 0; i < COUNT; i += BATCH) {
    const chunk = [];
    for (let j = i; j < Math.min(i + BATCH, COUNT); j++) {
      const externalId = `ORD-SPAM-${Date.now().toString(36).toUpperCase()}-${j}`;

      chunk.push(
        (async () => {
          await prisma.order.create({
            data: {
              externalId,
              lineItems: [
                {
                  productSlug: "simulasi-tees",
                  productName: "Simulasi Tees (spam test)",
                  size: "M",
                  quantity: 1,
                  unitPrice: FAKE_AMOUNT,
                },
              ] as object,
              amount: FAKE_AMOUNT,
              customerName: FAKE_NAME,
              customerEmail: FAKE_EMAIL,
              customerPhone: FAKE_PHONE,
              provider: "xendit",
              currency: "IDR",
              status: "PENDING",
            },
          });

          const vars = {
            customer_name: FAKE_NAME,
            order_id: externalId,
            total: formatIdr(FAKE_AMOUNT),
            status: "PENDING",
          };
          const titleRendered = renderTemplate(title, vars);
          const messageRendered = renderTemplate(message, vars);

          await prisma.notificationLog.create({
            data: {
              event: EVENT,
              externalId,
              title: titleRendered,
              message: messageRendered,
              sound,
              channel: "realtime",
              status: "sent",
            },
          });

          const payload = JSON.stringify({
            title: titleRendered,
            body: messageRendered,
            icon: "/icons/icon-192.png",
            url: `/admin/orders/${encodeURIComponent(externalId)}`,
            orderId: externalId,
          });

          await Promise.all(
            subs.map(async (sub) => {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  payload,
                );
                sent++;
              } catch (err) {
                const statusCode = (err as { statusCode?: number })?.statusCode;
                const message = (err as { message?: string })?.message ?? String(err);
                if (statusCode === 404 || statusCode === 410) {
                  stale.add(sub.endpoint);
                } else {
                  failed++;
                  if (sent + failed <= 3) console.log(`    ERR status=${statusCode} msg=${message.slice(0, 200)}`);
                }
              }
            }),
          );
        })(),
      );
    }
    await Promise.all(chunk);
    console.log(`  batch ${i / BATCH + 1}/${Math.ceil(COUNT / BATCH)} selesai (${Math.min(i + BATCH, COUNT)}/${COUNT})`);
  }

  for (const endpoint of stale) {
    await prisma.notificationSubscription.deleteMany({ where: { endpoint } });
  }
  if (stale.size > 0) console.log(`Stale subscriptions dihapus: ${stale.size}`);

  console.log(`\nSELESAI: ${sent} push terkirim, ${failed} gagal, ${stale.size} stale (dibersihkan).`);
}

main()
  .catch((e) => {
    console.error("\nGagal:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
