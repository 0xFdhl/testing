import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Retention policy untuk tabel WebhookEvent (cegah membengkak tanpa batas).
 * Hapus event yang sudah diproses lebih lama dari `retentionDays` (default 90 hari).
 * Event berstatus "received"/"failed" (belum terminal) tidak dihapus untuk audit.
 *
 * Jalankan via cron job (Vercel Cron / external scheduler) harian/mingguan.
 */
export async function purgeOldWebhookEvents(retentionDays = 90): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await prisma.webhookEvent.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      status: { in: ["processed"] },
    },
  });

  logger.info("webhookevent retention purge", {
    purged: result.count,
    cutoff: cutoff.toISOString(),
  });
  return result.count;
}