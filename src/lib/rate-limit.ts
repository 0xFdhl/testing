type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, 60_000);

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * CSRF: validasi Origin untuk API route non-server-action.
 * Tolak request yang Origin/Referer-nya bukan dari host app sendiri.
 * `sameSite` default Next.js cookie + cek ini menutup vektor CSRF standar.
 */
export function isSameOrigin(request: Request): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return true;
  let allowedHost: string;
  try {
    allowedHost = new URL(appUrl).host;
  } catch {
    return true;
  }

  for (const headerName of ["origin", "referer"]) {
    const value = request.headers.get(headerName);
    if (!value) continue;
    try {
      const host = new URL(value).host;
      if (host !== allowedHost) return false;
    } catch {
      return false;
    }
  }
  return true;
}
