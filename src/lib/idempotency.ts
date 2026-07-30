import "server-only";
import { createHash } from "node:crypto";

type Entry = {
  result: unknown;
  expiresAt: number;
};

const store = new Map<string, Entry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.expiresAt) store.delete(key);
  }
}, 60_000).unref?.();

export type IdempotencyResult<T> =
  | { hit: true; result: T }
  | { hit: false };

/**
 * Idempotency untuk server action checkout (anti double-submit/double-click).
 * In-memory dengan TTL pendek (default 5 menit) — cukup untuk window double-click
 * dan retry otomatis client dalam satu instance.
 *
 * Untuk multi-instance production, ganti backing store ke Redis/DB (lihat
 * SECURITY.md §2.7). Konsisten dengan pola in-memory `rate-limit.ts` saat ini.
 */
export function checkIdempotency<T>(key: string): IdempotencyResult<T> {
  const entry = store.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return { hit: true, result: entry.result as T };
  }
  return { hit: false };
}

export function rememberIdempotency<T>(key: string, result: T, ttlMs = 5 * 60_000): void {
  store.set(key, { result, expiresAt: Date.now() + ttlMs });
}

export function clearIdempotency(key: string): void {
  store.delete(key);
}

/**
 * Hash idempotency key dari userId + snapshot intent checkout agar double-click
 * dengan input identik menghasilkan key sama → dedup. Deterministik per intent.
 * Window dedup diatur TTL `checkIdempotency` (default 5 menit).
 */
export function deriveCheckoutKey(
  userId: string,
  intent: { productSlug: string; size: string; quantity: number; customerEmail: string },
): string {
  const sig = [
    userId,
    intent.productSlug,
    intent.size,
    String(intent.quantity),
    intent.customerEmail,
  ].join("|");
  const hash = createHash("sha256").update(sig).digest("hex").slice(0, 16);
  return `checkout:${hash}`;
}

export function deriveCartCheckoutKey(
  userId: string,
  intent: { items: Array<{ productSlug: string; size: string; quantity: number }>; customerEmail: string },
): string {
  const sig = [
    userId,
    intent.customerEmail,
    ...intent.items.map((i) => `${i.productSlug}:${i.size}:${i.quantity}`),
  ].join("|");
  const hash = createHash("sha256").update(sig).digest("hex").slice(0, 16);
  return `checkout:cart:${hash}`;
}