/**
 * Simulasi checkout user palsu → trigger notifikasi admin (order_created).
 *
 * Membuat order PENDING fake di DB, lalu menjalankan pipeline notifikasi
 * yang sama persis dengan yang dipanggil checkout.ts (emitOrderNotification):
 * render template → insert NotificationLog → kirim web-push ke semua
 * subscription admin.
 *
 * Env: pakai .env.local secara default. Untuk menargetkan DB production
 * Vercel, set SIM_ENV_FILE=<path hasil `vercel env pull`>:
 *   vercel env pull C:\Temp\prod.env --environment=production --yes
 *   $env:SIM_ENV_FILE="C:\Temp\prod.env"; npx tsx scripts/simulate-customer-order.ts
 */
import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local"), override: true });
const overrideFile = process.env.SIM_ENV_FILE;
if (overrideFile) {
  config({ path: overrideFile, override: true });
}

import webpush from "web-push";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_TEMPLATES, renderTemplate } from "../src/lib/notifications/templates";
import { formatIdr } from "../src/lib/format";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const EVENT = "order_created" as const;
const FAKE_PHONE = "081298765432";
const FAKE_EMAIL = "simulasi.user@example.com";
const FAKE_NAME = "Test User (SIMULASI)";
const FAKE_AMOUNT = 150_000;

async function main() {
  const subs = await prisma.notificationSubscription.findMany({
    where: { adminId: { not: null } },
  });

  console.log(`[1/5] Admin subscriptions di DB: ${subs.length}`);
  if (subs.length === 0) {
    throw new Error(
      "Belum ada subscription admin. Buka /admin di HP, aktifkan notifikasi (Settings → Enable), lalu jalankan ulang.",
    );
  }

  const externalId = `ORD-SIM-${Date.now().toString(36).toUpperCase()}`;

  await prisma.order.create({
    data: {
      externalId,
      lineItems: [
        {
          productSlug: "simulasi-tees",
          productName: "Simulasi Tees (fake order)",
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
  console.log(`[2/5] Order PENDING dibuat: ${externalId}`);

  const row = await prisma.notificationTemplate.findUnique({
    where: { event: EVENT },
  });
  const fallback = DEFAULT_TEMPLATES[EVENT];
  const enabled = row?.enabled ?? true;
  const title = row?.title ?? fallback.title;
  const message = row?.message ?? fallback.message;
  const sound = row?.sound ?? fallback.sound ?? null;

  const vars = {
    customer_name: FAKE_NAME,
    order_id: externalId,
    total: formatIdr(FAKE_AMOUNT),
    status: "PENDING",
  };
  const titleRendered = renderTemplate(title, vars);
  const messageRendered = renderTemplate(message, vars);
  console.log(`[3/5] Template: "${titleRendered}" / "${messageRendered}" (enabled=${enabled})`);

  await prisma.notificationLog.create({
    data: {
      event: EVENT,
      externalId,
      title: titleRendered,
      message: messageRendered,
      sound,
      channel: "realtime",
      status: enabled ? "sent" : "skipped",
    },
  });
  console.log(`[4/5] NotificationLog ditulis (${enabled ? "sent" : "skipped"})`);

  if (!enabled) {
    console.log("Template order_created non-aktif — push tidak dikirim.");
    return;
  }

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error("VAPID keys belum diisi di env — push tidak bisa dikirim.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const payload = JSON.stringify({
    title: titleRendered,
    body: messageRendered,
    icon: "/icons/icon-192.png",
    url: `/admin/orders/${encodeURIComponent(externalId)}`,
    orderId: externalId,
  });

  const results = await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        return { endpoint: sub.endpoint, ok: true };
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 403 || statusCode === 404 || statusCode === 410) {
          await prisma.notificationSubscription.deleteMany({
            where: { endpoint: sub.endpoint },
          });
          return { endpoint: sub.endpoint, ok: false, stale: true };
        }
        return {
          endpoint: sub.endpoint,
          ok: false,
          error: String((err as { message?: string })?.message ?? err),
        };
      }
    }),
  );

  console.log(`[5/5] Push dikirim ke ${results.filter((r) => r.ok).length}/${subs.length} device:`);
  for (const r of results) {
    console.log(
      `  - ${r.ok ? "OK" : "GAGAL"}: ${r.endpoint.slice(0, 60)}…${
        "stale" in r && r.stale ? " (subscription basi, dihapus)" : "error" in r ? ` ${r.error}` : ""
      }`,
    );
  }

  console.log(`\nSelesai. Cek notifikasi di HP admin — klik harus buka ${externalId}.`);
}

main()
  .catch((e) => {
    console.error("\nGagal:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
