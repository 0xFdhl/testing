import "server-only";
import { randomUUID } from "node:crypto";

const DEFAULT_BUCKET = "product-images";
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/avif",
] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const ALLOWED_EXTENSIONS: Record<AllowedImageMimeType, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
};

export class StorageConfigError extends Error {}

export class ImageValidationError extends Error {}

function getProjectRef(): string | null {
  const url = process.env.SUPABASE_URL;
  if (url) {
    try {
      const u = new URL(url);
      // subdomain pertama = project ref (mis. omwimvhtwlrbqqareypp.supabase.co)
      const host = u.hostname;
      const ref = host.split(".")[0];
      if (ref && host.endsWith("supabase.co")) return ref;
    } catch {
      // bawah via DATABASE_URL
    }
  }
  const dbUrl = process.env.DATABASE_URL ?? "";
  try {
    const u = new URL(dbUrl);
    const ref = u.username.replace("postgres.", "");
    if (ref && u.hostname.endsWith("supabase.com")) return ref;
  } catch {
    // ignore
  }
  return null;
}

function requireServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key === "REPLACE_ME") {
    throw new StorageConfigError(
      "SUPABASE_SERVICE_ROLE_KEY belum diset. Isi di .env (dashboard Supabase → Project Settings → API → service_role).",
    );
  }
  return key;
}

function resolveProjectUrl(): string {
  const url = process.env.SUPABASE_URL;
  if (url && url !== "REPLACE_ME") return url.replace(/\/$/, "");
  const ref = getProjectRef();
  if (!ref) {
    throw new StorageConfigError(
      "Tidak bisa menurunkan project Supabase. Set SUPABASE_URL di .env.",
    );
  }
  return `https://${ref}.supabase.co`;
}

export function bucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
}

export function maxUploadBytes(): number {
  const raw = Number(process.env.MAX_IMAGE_UPLOAD_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_BYTES;
}

function assertMimeAllowed(mime: string | null): asserts mime is AllowedImageMimeType {
  if (!mime || !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)) {
    throw new ImageValidationError(
      "Format file tidak didukung. Gunakan webp, jpg, png, atau avif.",
    );
  }
}

async function assertImageSignature(file: File, mime: AllowedImageMimeType): Promise<void> {
  const buffer = await file.slice(0, 16).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isPng = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const isAvif = bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" && /^(avif|avis)$/.test(String.fromCharCode(...bytes.slice(8, 12)));
  const valid = mime === "image/png" ? isPng : mime === "image/jpeg" ? isJpeg : mime === "image/webp" ? isWebp : isAvif;
  if (!valid) throw new ImageValidationError("Isi file tidak cocok dengan format gambar yang dipilih.");
}

function randomId(): string {
  return randomUUID();
}

function buildObjectPath(productId: string, mime: AllowedImageMimeType): string {
  const ext = ALLOWED_EXTENSIONS[mime];
  const stamp = Date.now().toString(36);
  return `products/${productId}/${stamp}-${randomId()}.${ext}`;
}

export type UploadedImage = {
  url: string;
  path: string;
};

/**
 * Upload file ke bucket Supabase Storage (object path: products/<id>/...).
 * Mengembalikan URL publik dari bucket public.
 *
 * Validasi MIME & ukuran dilakukan di sini (defense-in-depth), namun caller
 * (server action) WAJIB juga memvalidasi permission admin + ukuran karena
 * helper ini tidak tahu konteks auth.
 */
export async function uploadProductImage(
  productId: string,
  file: File,
): Promise<UploadedImage> {
  if (!productId) throw new ImageValidationError("Product id kosong");

  const size = file.size;
  if (size <= 0) throw new ImageValidationError("File kosong.");
  if (size > maxUploadBytes()) {
    const mb = (maxUploadBytes() / (1024 * 1024)).toFixed(1);
    throw new ImageValidationError(`Ukuran melebihi ${mb} MB.`);
  }

  const mime = file.type || null;
  assertMimeAllowed(mime);
  await assertImageSignature(file, mime);

  const base = resolveProjectUrl();
  const serviceKey = requireServiceKey();
  const bucket = bucketName();
  const path = buildObjectPath(productId, mime);

  const endpoint = `${base}/storage/v1/object/${bucket}/${path}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": mime,
      "x-upsert": "true",
    },
    body: file,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      detail = body?.message || body?.error || "";
    } catch {
      // ignore
    }
    throw new StorageConfigError(
      `Upload gagal (HTTP ${res.status}). ${detail}`.trim(),
    );
  }

  // URL publik untuk public bucket (tanpa auth).
  const publicUrl = `${base}/storage/v1/object/public/${bucket}/${path}`;
  return { url: publicUrl, path };
}

/** Delete only managed objects belonging to one product in the configured bucket. */
export async function deleteProductImages(productId: string, urls: string[]): Promise<void> {
  if (!productId || urls.length === 0) return;
  const base = resolveProjectUrl();
  const bucket = bucketName();
  const prefix = `/storage/v1/object/public/${bucket}/products/${productId}/`;
  const paths = urls.flatMap((value) => {
    try {
      const url = new URL(value);
      if (url.origin !== base || !url.pathname.startsWith(prefix)) return [];
      return [decodeURIComponent(url.pathname.slice(prefix.length))];
    } catch {
      return [];
    }
  }).filter(Boolean);
  if (paths.length === 0) return;

  const response = await fetch(`${base}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${requireServiceKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: paths.map((path) => `products/${productId}/${path}`) }),
  });
  if (!response.ok) throw new StorageConfigError(`Hapus gambar gagal (HTTP ${response.status}).`);
}

/** Domain storage (untuk next.config images.remotePatterns). */
export function storagePublicHost(): string | null {
  try {
    return new URL(resolveProjectUrl()).hostname;
  } catch {
    return null;
  }
}
