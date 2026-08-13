import "server-only";

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

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
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

  assertMimeAllowed(file.type || null);

  const base = resolveProjectUrl();
  const serviceKey = requireServiceKey();
  const bucket = bucketName();
  const path = buildObjectPath(productId, file.type as AllowedImageMimeType);

  const endpoint = `${base}/storage/v1/object/${bucket}/${path}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": file.type,
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

/** Domain storage (untuk next.config images.remotePatterns). */
export function storagePublicHost(): string | null {
  try {
    return new URL(resolveProjectUrl()).hostname;
  } catch {
    return null;
  }
}