# PLANNING — Dual Payment Gateway (Xendit + Stripe)

Perencanaan implementasi penambahan Stripe + routing regional. Bertujuan: user region `id` → Xendit (IDR), user region `intrl` → Stripe (USD), tanpa breaking integrasi Xendit yang sudah ada.

---

## 1. Tujuan

- Tambah gateway Stripe untuk region internasional.
- Routing otomatis berdasarkan `User.region` (DB field).
- Amankan & siap maintain untuk production.
- Tidak menambah dependency npm — gunakan `fetch` mentah (mirip pola `lib/xendit/`).

## 2. Keputusan Desain (dari klarifikasi)

| Keputusan | Pilihan | Alasan |
|-----------|---------|--------|
| Sumber region | Field `region` di DB | Explicit, tidak bisa dimanipulasi client, akurat untuk audit |
| Mata uang | Currency per-gateway | IDR (Xendit) + USD sen (Stripe), konversi server-side |
| Integrasi Stripe | Checkout Session (hosted) | Mirror pola Xendit, paling cepat & aman |
| Penanganan audit lama | Pindah ke appendix README | Konteks historis tetap, tidak mendominasi |

## 3. Logika Routing

```
resolveGateway(region: Region): Provider
  region === "intrl" ? "stripe" : "xendit"
```

Pure function, deterministik, mudah di-test. Region didapat dari DB/JWT — tidak pernah dari input client. Routing di server (action/API) sehingga client tidak bisa memaksa gateway.

```
User login (session.user.id)
  │
  ▼  getUserRegion(userId) → Region  (default "id" bila null)
  │
  ▼  resolveGateway(region) → Provider
  │
  ▼  currency = provider === "xendit" ? "IDR" : "USD"
  │  amountMinor = provider === "xendit" ? amountIDR : idrToUsdCents(amountIDR)
  │
  ▼  createCheckout(provider, input) → CheckoutSession
  │
  ▼  simpan Order { provider, currency, gatewayInvoiceId, hostedUrl }
  │
  ▼  redirect user ke session.url
```

## 4. Arsitektur Folder Target

```
src/
├── lib/
│   ├── payments/            # dispatcher agnostik (baru)
│   │   ├── index.ts
│   │   ├── router.ts
│   │   ├── currency.ts
│   │   ├── types.ts
│   │   └── errors.ts
│   ├── xendit/             # sudah ada
│   └── stripe/             # baru, mirror struktur xendit
│       ├── index.ts
│       ├── config.ts
│       ├── client.ts
│       ├── types.ts
│       └── errors.ts
├── actions/
│   ├── checkout.ts          # refactor → pakai dispatcher
│   └── profile.ts           # baru: setRegion (opsi A)
├── app/api/
│   ├── webhook/
│   │   ├── xendit/route.ts  # sudah ada
│   │   └── stripe/route.ts   # baru
│   └── payment/create/route.ts   # tambah region resolution
└── proxy.ts                 # CSP: tambah api.stripe.com & js.stripe.com
```

## 5. Perubahan Data Layer (Prisma)

### `prisma/schema.prisma` — tambahan

```prisma
enum Region { id intrl }
enum Currency { IDR USD }
enum PaymentProvider { xendit stripe }

model User {
  // ...existing fields...
  region Region @default(id)
}

model Order {
  // ...existing fields...
  xenditInvoiceId String?   // dipertahankan sebagai alias lama (atau rename → gatewayInvoiceId)
  gatewayInvoiceId String?  // baru: id generik (xendit invoice id OR stripe session id)
  provider         PaymentProvider
  currency         Currency
  // index tambahan
  @@index([provider])
}
```

> Rekomendasi: rename `xenditInvoiceId` → `gatewayInvoiceId` (migrasi aman karena repo masih prototipe + seed). Bila ingin backward-compat, pakai alias di layer mapper `store.ts`.

**Migration:** `prisma migrate dev --name add_region_provider_currency`.

## 6. Layer Baru — `src/lib/payments/`

### `types.ts`
```ts
export type Provider = "xendit" | "stripe";
export type Region = "id" | "intrl";
export type Currency = "IDR" | "USD";

export type CreateCheckoutInput = {
  externalId: string;
  amountMinor: number;      // IDR rupiah penuh / USD sen
  currency: Currency;
  description: string;
  customerEmail: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; unitPriceMinor: number }>;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = {
  provider: Provider;
  sessionId: string;       // xendit invoice id OR stripe session id
  url: string;              // hosted URL
  status: "PENDING";
  expiresAt?: Date;
};

export type ProviderStatus = "PENDING" | "PAID" | "EXPIRED";
```

### `router.ts`
```ts
export function resolveGateway(region: Region): Provider {
  return region === "intrl" ? "stripe" : "xendit";
}
export async function getUserRegion(userId: string): Promise<Region> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { region: true } });
  return u?.region ?? "id";
}
```

### `currency.ts`
```ts
const RATE_IDR_TO_USD = Number(process.env.IDR_TO_USD_RATE ?? "0.000064");
export function idrToUsdCents(idr: number): number {
  if (!Number.isFinite(idr) || idr < 0) throw new PaymentError("invalid amount");
  return Math.round(idr * RATE_IDR_TO_USD * 100);
}
```

### `index.ts` — dispatcher
```ts
export async function createCheckout(provider: Provider, input: CreateCheckoutInput): Promise<CheckoutSession> {
  return provider === "xendit" ? createXenditInvoice(input) : createStripeSession(input);
}
export async function getProviderStatus(provider, externalId): Promise<ProviderStatus> { ... }
```

## 7. Layer Baru — `src/lib/stripe/`

### `config.ts` (mirror `xendit/config.ts`)
- `getStripeSecretKey()` — throw jika `STRIPE_SECRET_KEY` kosong.
- `getStripeWebhookSecret()` — `whsec_...`.
- `isStripeTestMode()` — deteksi prefix `sk_test_` atau env `STRIPE_MODE`.

### `client.ts`
```ts
export async function createCheckoutSession(input): Promise<CheckoutSession> {
  const key = getStripeSecretKey();
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      mode: "payment",
      currency: input.currency.toLowerCase(),   // "usd"
      customer_email: input.customerEmail,
      "metadata[externalId]": input.externalId,
      "metadata[provider]": "stripe",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      ...buildLineItemsParams(input.items),
    }).toString(),
    cache: "no-store",
  });
  if (!res.ok) throw await parseStripeError(res);
  const s = await res.json();
  return { provider: "stripe", sessionId: s.id, url: s.url, status: "PENDING",
           expiresAt: s.expires_at ? new Date(s.expires_at * 1000) : undefined };
}

export async function getSession(id): Promise<StripeSession> { ... }

export function verifyWebhookSignature(req: Request, rawBody: string): boolean {
  // Stripe-Signature: t=...,v1=... → HMAC SHA256(rawBody, secret), timingSafeEqual
}
```

> Pakai `URLSearchParams` (bukan Stripe SDK) → konsisten dengan pola `fetch` mentah di `xendit/client.ts`, minim dependensi.

### `types.ts` & `errors.ts`
- `StripeSession`, `StripeWebhookEvent`.
- `StripeError` mirror `XenditError` (`statusCode`, `userMessage` sanitized).

## 8. Refactor `src/actions/checkout.ts`

### `processCheckout` (perubahan)
1. `const region = await getUserRegion(userId);`
2. `const provider = resolveGateway(region);`
3. Hitung `currency` & `amountMinor` via `currency.ts`.
4. `const session = await createCheckout(provider, payload);`
5. Simpan `provider`, `currency`, `gatewayInvoiceId: session.sessionId`, `hostedUrl: session.url`.
6. `return { ok: true, redirectUrl: session.url };`

Amount & currency ditetapkan server & disimpan saat checkout → webhook tidak mengandalkan amount dari gateway (cegah price manipulation).

### `syncOrderPaymentStatus` (perubahan)
- `order.provider === "xendit"` → `getInvoice` (sudah ada).
- `order.provider === "stripe"` → `getSession(id)`, map status `paid → PAID`, `expired → EXPIRED`.

## 9. API Route `src/app/api/payment/create/route.ts`

Tambah region resolution (helper `getUserRegion` di `lib/payments/router.ts`) agar endpoint publik konsisten dengan server action. Tetap di-belakang `auth()`.

## 10. Webhook Stripe — `src/app/api/webhook/stripe/route.ts`

Mirror `webhook/xendit/route.ts`:
1. **Raw body wajib**: `const raw = await req.text()` dulu, lalu `verifyWebhookSignature(req, raw)`, baru `JSON.parse(raw)`.
2. Idempotency via `WebhookEvent` (`eventId = payload.id` dari Stripe event).
3. Map event:
   - `checkout.session.completed` + `payment_status: "paid"` → `PAID`.
   - `checkout.session.expired` → `EXPIRED`.
4. Update `WebhookEvent.type` bila ingin simpan tipe event Stripe.

## 11. Set Region User — Opsi A (dipilih)

- **next-auth `jwt` callback**: saat login, bila `user.region` null → set default `id`. Tanam `token.region = user.region` ke JWT (dibaca saat checkout, bukan query DB tiap request).
- **Halaman `/account`**: server action `setRegion(region)` → update DB + `revalidate`. Toggle `id`/`intrl`.
- Region dari token (JWT) → performa, tapi authoritative karena asalnya DB.

Implementasi: `src/actions/profile.ts` + komponen toggle region.

## 12. CSP Update — `src/proxy.ts`

Tambah `https://api.stripe.com` & `https://js.stripe.com` ke `connect-src` (dan `script-src` bila pakai Stripe.js, walau hosted Checkout tidak butuh).

## 13. Environment Variables — `.env.example`

Tambah blok Stripe:
```
# STRIPE — PAYMENT GATEWAY (intl)
STRIPE_SECRET_KEY=sk_test_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_ME
STRIPE_MODE=test
IDR_TO_USD_RATE=0.000064
```

## 14. Keamanan untuk Maintain & Produce

1. Routing server-only — region/provider tidak dari input client.
2. Amount & currency diset server, disimpan saat checkout; webhook hanya baca status.
3. Secret key server-only (`server-only` import).
4. Webhook signature verification wajib + `timingSafeEqual` (kedua gateway); Stripe pakai raw body HMAC.
5. Idempotency webhook via `WebhookEvent`, `eventId` unik per provider.
6. Rate limit pada endpoint pembuatan payment (sudah ada).
7. Error message sanitized — tidak bocor detail gateway ke client.
8. CSP: `api.stripe.com` & `js.stripe.com`.
9. No new npm dependency — `fetch` mentah, kurangi surface supply-chain.
10. `isStripeTestMode()` untuk banner UI test (mirror `isXenditTestMode()`).

## 15. Test Plan (vitest, pola `*.test.ts`)

| File | Skenario |
|------|----------|
| `lib/payments/router.test.ts` | matrix `region → provider` (id→xendit, intrl→stripe, null/default→xendit) |
| `lib/payments/currency.test.ts` | konversi IDR→USD sen, edge (0, negatif, non-finite, rate env) |
| `lib/stripe/client.test.ts` | mock `fetch`, assert URL params + metadata, error mapping (401/400) |
| `lib/stripe/config.test.ts` | mode detection dari key prefix / env |
| `lib/stripe/errors.test.ts` | sanitasi pesan error |
| `lib/xendit/client.test.ts` | sudah ada, pastikan tak regress |
| `schemas/payment.test.ts` | validasi input (sudah ada) |

Tambahan ideal: integration test webhook signature (positive + tampered).

## 16. Urutan Eksekusi

1. **Schema + migration** — `Region`/`Currency`/`PaymentProvider`, kolom `gatewayInvoiceId`, `currency`, `provider`.
2. **`lib/stripe/*` + `lib/payments/*`** — implementasi + tests.
3. **Refactor `actions/checkout.ts` & `api/payment/create`** — pakai dispatcher.
4. **Webhook Stripe route** + **CSP update** (`proxy.ts`).
5. **Set-region UI** + **next-auth `jwt` callback**.
6. **`.env.example`** + docs.

## 17. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Konversi IDR→USD kurang akurat (rate const) | Override via env; saat produksi pertimbangkan dual-price per produk atau rate dari API |
| Rename `xenditInvoiceId` → `gatewayInvoiceId` | Lakukan sekarang (repo masih prototipe, data seed) |
| Akun Stripe tidak support IDR | Gunakan USD sen untuk region `intrl` (sesuai desain) |
| Webhook Stripe butuh raw body | Implementasi: `req.text()` dulu sebelum verify |
| Region belum diset untuk user existing | Default `id` di `jwt` callback + DB default |

## 18. Trade-off / Open Questions

- **Dual-price vs rate const**: dual-price per produk lebih akurat tapi butuh data migration. Rate const lebih cepat untuk iterasi awal — revisi saat produksi.
- **Rename kolom vs alias**: rename lebih bersih; alias lebih aman bila ada data produksi. Rekomendasi: rename sekarang.
- **Opsi set-region**: Opsi A (default saat login + edit `/account`) dipilih. Alternatif: admin set region per-user.

## 19. Status Per-Isu Audit (tracker)

Isu audit lama (README appendix) — status setelah rencana ini dijalankan:

| Isu audit | Status |
|-----------|--------|
| 1.1 No Database | ✅ Prisma + PostgreSQL |
| 1.2 No Auth payment API | ✅ `auth()` ditambahkan; pertimbangkan hapus route publik |
| 1.3 No Transactions/FK | ✅ `prisma.$transaction` untuk stock |
| 1.4 No Stock Deduction | ✅ ada di `processCheckout` |
| 1.5 Duplicate Product Slugs | ⚠️ perlu verifikasi seed |
| 1.6 Webhook Idempotency | ✅ tabel `WebhookEvent` |
| 2.1 Timing Attack | ✅ `crypto.timingSafeEqual` |
| 2.2 No Rate Limiting | ✅ `checkRateLimit` |
| 2.3 API Key Leaked | ⚠️ rotasi + `.gitignore` |
| 2.4 No Security Headers | ✅ CSP via `proxy.ts` |
| 2.5 Webhook Race | ✅ cek status terminal sebelum update |
| 2.6 Failure URL PII | ⚠️ `encodeURIComponent` / context server-side |
| 2.7 No Logging | ⚠️ struktur logging masih TODO |

---

## 20. Status Implementasi

| Step | Item | Status |
|------|------|--------|
| 1 | Schema + migration (Region, Currency, PaymentProvider, fields) | ✅ done |
| 2 | `lib/stripe/*` — config, client, types, errors | ✅ done |
| 2 | `lib/payments/*` — router, currency, dispatcher, types, errors | ✅ done |
| 2 | Test `lib/payments/router.test.ts` + `currency.test.ts` + `lib/stripe/config.test.ts` | ✅ done (131 total) |
| 3 | Refactor `actions/checkout.ts` → region dispatcher + dual provider | ✅ done |
| 3 | Refactor `api/payment/create/route.ts` → region resolution | ✅ done |
| 4 | Webhook Stripe route `/api/webhook/stripe` | ✅ done |
| 4 | CSP update (`proxy.ts` + `api.stripe.com`) | ✅ done |
| 5 | next-auth `jwt` callback + `session` callback (region in token) | ✅ done |
| 5 | Type augmentation `src/types/next-auth.d.ts` | ✅ done |
| 5 | Server action `setRegion()` + `getRegion()` di `actions/profile.ts` | ✅ done |
| 5 | Region toggle UI component | ⏳ pending (built-in `/account` page) |
| 6 | `.env.example` Stripe vars + region docs | ✅ done |
| — | Verifikasi: typecheck ✅ lint ✅ test 131/131 ✅ | ✅ done |

### Catatan

- Region dibaca dari `session.user.region` (JWT cache) — authoritative karena diisi dari DB saat login via `jwt` callback.
- Untuk production multi-instance: idempotency store perlu Redis (lihat `lib/idempotency.ts` docs).
- `WebhookEvent` retention cron belum dijadwalkan (function `purgeOldWebhookEvents` tersedia).
- Region toggle UI bisa ditambahkan di halaman `/account` dengan komponen `<RegionToggle />` default value dari `session.user.region`.

---

*Update dokumen ini setiap ada perubahan arsitektur atau progress implementasi.*