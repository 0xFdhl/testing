# yourbrand — Winter Sport Gear E-Commerce

> Dual payment gateway (Xendit + Stripe) dengan routing berbasis region user.
> Mode default: **test/sandbox**. Audit readiness produksi lama ada di [Appendix: Production Readiness Audit](#appendix-production-readiness-audit).

---

## Cara Kerja Payment Gateway

Sistem memilih payment gateway otomatis berdasarkan **region user** yang disimpan di database (`User.region`), bukan heuristic runtime. Routing terjadi sepenuhnya di server (server action / API route), sehingga client tidak bisa memaksa gateway.

### Alur

```
User login (session.user.id)
   │
   ▼
Baca User.region dari DB (default: id)
   │
   ├── region === "id"    ──▶ Xendit  (IDR, hosted invoice)
   └── region === "intrl" ──▶ Stripe  (USD, Checkout Session hosted)
   │
   ▼
Buat order (amount + currency diset SERVER, disimpan ke DB)
   │
   ▼
Buat session/invoice via gateway ──▶ redirect user ke hosted URL
   │
   ▼
Webhook gateway ──▶ verifikasi signature (timing-safe) + idempotency event
                 ──▶ update Order status (PAID / EXPIRED)
```

### Perbandingan Gateway

| Aspek          | Xendit (region `id`)        | Stripe (region `intrl`)          |
|----------------|-----------------------------|----------------------------------|
| Endpoint       | `POST /v2/invoices`         | `POST /v1/checkout/sessions`     |
| Hosted URL     | `invoice.invoice_url`       | `session.url`                    |
| Currency       | IDR (rupiah penuh)          | USD (sen)                        |
| Webhook header | `x-callback-token`          | `Stripe-Signature` (HMAC SHA256) |
| Verifikasi     | `timingSafeEqual` token     | HMAC + `timingSafeEqual`         |
| Idempotency    | `WebhookEvent.eventId`      | `WebhookEvent.eventId`           |

### Lapisan Kode

| File                                  | Peran                                                                |
|---------------------------------------|----------------------------------------------------------------------|
| `src/lib/payments/router.ts`          | `resolveGateway(region)` → `"xendit" \| "stripe"`. Pure, mudah di-test. |
| `src/lib/payments/currency.ts`        | Konversi IDR↔USD (rate dari env `IDR_TO_USD_RATE`), server-side only.  |
| `src/lib/payments/types.ts`           | Tipe agnostik: `CreateCheckoutInput`, `CheckoutSession`.            |
| `src/lib/payments/index.ts`           | Dispatcher: `createCheckout(provider, input)` → gateway terkait.    |
| `src/lib/xendit/*`                    | Implementasi Xendit (sudah ada).                                   |
| `src/lib/stripe/*`                    | Implementasi Stripe (mirror struktur xendit, via `fetch` mentah).   |
| `src/actions/checkout.ts`             | Orchestrator: ambil region → pilih gateway → buat order + session.  |
| `src/app/api/webhook/xendit/route.ts` | Webhook Xendit.                                                     |
| `src/app/api/webhook/stripe/route.ts` | Webhook Stripe (raw body wajib sebelum verify signature).          |
| `src/app/api/payment/create/route.ts` | REST alternatif; juga ikut routing region.                         |
| `prisma/schema.prisma`                | Enum `Region`/`Currency`/`PaymentProvider`; kolom `gatewayInvoiceId`. |

### Prinsip Keamanan Inti

1. **Routing server-only** — `region`/`provider` tidak pernah dipercaya dari input client; sumbernya DB/JWT yang divalidasi.
2. **Amount & currency ditetapkan server** lewat harga produk dari DB, lalu disimpan ke Order saat checkout. Webhook hanya membaca `externalId` + status → mencegah price manipulation.
3. **Webhook signature verification** wajib + `crypto.timingSafeEqual` (kedua gateway). Stripe memakai raw body + HMAC SHA256.
4. **Idempotency** webhook via tabel `WebhookEvent` (`eventId` unik per provider).
5. **Secret key di server only** (`server-only` import).
6. **Rate limit** pada endpoint pembuatan payment.

Rincian rencana implementasi lihat [`PLANNING.md`](./PLANNING.md).

---

## Production Test Checklist

Sebelum deploy ke production, semua item di bawah harus lulus.

### Routing & Gateway
- [ ] User `region=id` → Xendit (cek `Order.provider === "xendit"`, `currency === "IDR"`).
- [ ] User `region=intrl` → Stripe (cek `Order.provider === "stripe"`, `currency === "USD"`).
- [ ] User region null → default `id`/Xendit, tidak throw.
- [ ] Client tidak bisa override `region`/`provider` via form/API.
- [ ] Amount & currency dihitung server-side; nilai client diabaikan.

### Webhook
- [ ] Webhook Xendit tanpa `x-callback-token` benar → 401.
- [ ] Webhook Stripe dengan signature salah → 400/401.
- [ ] Webhook dengan signature benar + event id baru → order jadi `PAID`/`EXPIRED`.
- [ ] Webhook replay (eventId sama) → idempotent (200, tidak ubah order terminal).
- [ ] Raw body Stripe dipakai untuk verifikasi (bukan JSON re-serialize).

### Currency & Price
- [ ] Konversi IDR→USD konsisten dengan `IDR_TO_USD_RATE`.
- [ ] Harga tak bisa dimanipulasi: amount order = jumlah dari harga produk DB.
- [ ] Negatif/zero amount ditolak oleh Zod.

### UX & Status
- [ ] Success redirect menandai order `PAID` (sync atau webhook).
- [ ] Cancel redirect menandai `CANCELLED` bila masih `PENDING`.
- [ ] Expire (invoice/session kedaluwarsa) → `EXPIRED`.
- [ ] Server restart tidak menghilangkan order (DB persistent).

### Umpan Balik & Error
- [ ] Pesan error gateway di-sanitize (tidak bocor detail internal).
- [ ] Rate limit 429 saat spam endpoint payment.
- [ ] CSP mengizinkan `api.stripe.com` & `js.stripe.com`.

---

## Environment Variables

Salin `.env.example` ke `.env.local` lalu isi.

### Xendit (region `id`)
```
XENDIT_MODE=test
XENDIT_TEST_SECRET_KEY=xnd_development_REPLACE_ME
XENDIT_TEST_PUBLIC_KEY=xnd_public_development_REPLACE_ME
XENDIT_TEST_WEBHOOK_TOKEN=REPLACE_ME
NEXT_PUBLIC_XENDIT_MODE=test
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Stripe (region `intrl`)
```
STRIPE_SECRET_KEY=sk_test_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_ME
STRIPE_MODE=test
IDR_TO_USD_RATE=0.000064
```

> Demo kartu Stripe test: `4242 4242 4242 4242` (success), `4000 0000 0000 9995` (decline).

---

## Getting Started

```bash
npm install
cp .env.example .env.local   # isi Xendit + Stripe test keys
npm run dev                  # http://localhost:3000
```

> Untuk testing webhook lokal, gunakan `ngrok http 3000` atau `cloudflared tunnel --url http://localhost:3000`, lalu daftarkan URL ke dashboard Xendit/Stripe.

---

## Testing

```bash
npm run test         # vitest
npm run test:watch
npm run test:coverage
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
```

File test yang relevan dengan gateway:
- `src/lib/payments/router.test.ts` — routing region→provider.
- `src/lib/payments/currency.test.ts` — konversi & edge case.
- `src/lib/stripe/client.test.ts` — mock `fetch`, assertion URL params & error mapping.
- `src/lib/stripe/config.test.ts` — mode detection.
- `src/lib/stripe/errors.test.ts` — sanitasi pesan error.
- `src/lib/xendit/client.test.ts` — sudah ada.
- `src/schemas/payment.test.ts` — validasi input.

---

## Tech Stack

- **Framework:** Next.js 16.2.6 (App Router)
- **UI:** React 19.2.4, Tailwind CSS v4, Framer Motion
- **Payment:** Xendit (IDR) + Stripe Checkout Session (USD) — routing regional
- **Validation:** Zod v4
- **DB:** PostgreSQL + Prisma 7
- **Auth:** next-auth (Google, JWT session)
- **Testing:** Vitest

---

## Appendix: Production Readiness Audit

> Audit lama (skor 12/100) dipertahankan di sini sebagai konteks historis. Banyak isu sudah ditangani oleh integrasi DB + gateway di atas; sisanya ditrack di `PLANNING.md`.

### Audit Summary

| Metric | Score |
|--------|-------|
| **Production Readiness** | **12/100** |
| **Security** | **18/100** |
| **Performance** | **55/100** |
| **Code Quality** | **35/100** |
| **Maintainability** | **30/100** |

Saat audit: in-memory store, tanpa stock tracking, endpoint payment publik. Lihat status terbaru di `PLANNING.md` untuk progres perbaikan.

### Must Fix Before Deployment (audit asli)

1. Replace in-memory order store with a real database
2. Implement stock tracking with atomic decrement/increment
3. Fix duplicate product slugs
4. Add authentication to the payment creation API endpoint
5. Implement webhook idempotency
6. Rotate all committed API keys
7. Add security headers (HSTS, CSP, X-Frame-Options, etc.)
8. Add idempotency key to checkout server actions
9. Fix timing-attack-vulnerable webhook token verification (use `crypto.timingSafeEqual`)
10. Add error boundaries and custom 404 pages
11. Add structured logging for all payment, webhook, and error events
12. Set production environment variables
13. Fix `featuredBannerPanels` undefined import
14. Add foreign keys, transactions, and indexes

### Critical Issues (highlight & status)

- **1.1 No Database** — kini Prisma + PostgreSQL (lihat `prisma/schema.prisma`).
- **1.2 No Auth on Payment Endpoint** — `auth()` ditambahkan; pertimbangkan hapus route publik.
- **1.3 No Transactions/Foreign Keys** — transaksi stock decrement sudah dipakai di `actions/checkout.ts` (`prisma.$transaction`).
- **1.4 No Stock Deduction** — kini ada, lihat `processCheckout`.
- **1.5 Duplicate Product Slugs** — perlu verifikasi data seed.
- **1.6 Webhook Not Idempotent** — kini tabel `WebhookEvent` + event-id unik.

### High Severity (highlight & status)

- **2.1 Timing Attack** — `verifyWebhookToken` kini pakai `crypto.timingSafeEqual`.
- **2.2 No Rate Limiting** — `checkRateLimit` kini ada di API payment.
- **2.3 API Key Leaked in `.env.local`** — rotasi & tambahkan ke `.gitignore`.
- **2.4 No Security Headers** — lihat `src/proxy.ts` (CSP).
- **2.5 Webhook Race Condition** — cek status terminal sebelum update.

Daftar lengkap isu low/medium & edge case lihat commit audit asli (2026-07-09). Status terbaru tiap isu ditrack di `PLANNING.md`.

---

*Dual-gateway architecture documented here. Detailed implementation plan: [`PLANNING.md`](./PLANNING.md).*