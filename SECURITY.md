# SECURITY — Threat Model & Mitigasi (yourbrand E-Commerce)

> Dokumen ini melengkapi [`README.md`](./README.md) (arsitektur) dan [`PLANNING.md`](./PLANNING.md) (rencana implementasi Stripe).
> Fokus: **skenario serangan konkret** yang realistis untuk e-commerce dengan dual payment gateway, dan mitigasi teknisnya.
> Update dokumen ini setiap ada insiden, pentest, atau perubahan arsitektur.

---

## 0. Status Pengujian Hardening (audit kode langsung)

Hasil pengujian langsung (typecheck/lint/test + audit kode terhadap setiap skenario di bawah).

| Tool | Hasil |
|------|------|
| `npm run typecheck` | ✅ PASS |
| `npm run lint` | ✅ PASS (0 error, 3 warning `<img>`) |
| `npm run test` | ✅ 120 tests / 14 files pass |

Patch yang Sudah Diapply (forked hardening ini):

| § | Mitigasi | Status setelah audit |
|---|----------|----------------------|
| 2.1 | `.strict()` di `checkoutSchema`/`cartCheckoutSchema`/`createPaymentSchema` | ✅ tersedia |
| 2.1 | Amount server-set dari harga DB (sudah ada) | ✅ |
| 2.4 | `transitionOrderStatus()` atomic `WHERE status FROM` (webhook + admin retry + checkout rollback) | ✅ |
| 2.7 | Idempotency key checkout server action (`deriveCheckoutKey`/`deriveCartCheckoutKey` + `checkIdempotency`/`rememberIdempotency`) di `actions/checkout.ts` | ✅ terbaru |
| 2.8 | Stock decrement serializable + optimistic lock `updatedAt` + affected-row check | ✅ |
| 2.9 | `import "server-only"` di `lib/xendit/{config,client,errors}.ts` | ✅ |
| 2.10 | Rate limit **per-user** + **per-IP** di `api/payment/create` (sebelumnya hanya IP) | ✅ |
| 2.11 | `isSameOrigin()` CSRF check (Origin/Referer walist host) di `api/payment/create` | ✅ |
| 2.12 | `createPaymentSchema` redirect URL whitelist host (`NEXT_PUBLIC_APP_URL`) | ✅ |
| 2.13 | `encodeURIComponent` untuk `externalId`/`slug`/`size` di failure redirect | ✅ |
| 2.14 | `getOrderByExternalId(externalId, userId?)` wajib filter `userId` di semua jalur user | ✅ |
| §3 structured logging | `lib/logger.ts` (JSON + redaksi PII) `info`/`warn`/`error`; dipakai webhook, checkout, payment API | ✅ terbaru |
| §3 dependency scanning | CI job `audit` (`npm audit --audit-level=high --omit=dev`) | ✅ terbaru |
| §3 secret scanning | CI job `secret-scan` (gitleaks/gitleaks-action@v2) | ✅ terbaru |
| §3 WebhookEvent retention | kolom `createdAt` + migration + `lib/webhook-retention.ts` `purgeOldWebhookEvents()` (test cover) | ✅ terbaru |

Item Masih Perlu Tindak Lanjut:

- **§2.6 JWT refresh after `setRegion()`** — N/A (region belum diimplement, N/A (region belum diimplement, lihat PLANNING.md).
- **Stripe webhook + timestamp tolerance** — N/A sebelum Stripe diimplement.
- **WebhookEvent retention cron scheduling** — function tersedia (`purgeOldWebhookEvents`), perlu daftarkan ke Vercel Cron / external scheduler (lihat `lib/webhook-retention.ts` docs).
- **Multi-instance idempotency** — impl in-memory (sama pola `rate-limit.ts`); untuk multi-instance production, ganti backing store ke Redis/DB (lihat `lib/idempotency.ts` docs & SECURITY.md §2.7).

> Catatan: "Backend route /api/payment/create" asalnya memvalidasi identitas via `auth()` saja — ditambah CSRF + rate-limit per-user; saran tetap **pertimbangkan menghapus** (README §2 appendix 1.2).
>
> Tambahan: implementasi idempotency & retention ini bertujuan production-grade untuk single-instance. Untuk horizontal scaling, lihat catatan "Multi-instance" di atas.

---

## 1. Threat Model Ringkas

| Aset | Ancaman utama | Dampak jika gagal |
|------|----------------|--------------------|
| Order & harga | Price manipulation | Kerugian finansial langsung |
| Webhook endpoint | Forged payment confirmation | Barang keluar tanpa bayar |
| Session/JWT | Account takeover, region spoofing | Order dibuat atas nama orang lain / gateway salah |
| Stock/inventory | Race condition, overselling | Order tidak bisa dipenuhi, refund massal |
| API keys/secrets | Key leakage | Full compromise akun Xendit/Stripe |
| Endpoint publik | Abuse, scraping, DoS | Downtime, biaya API meningkat |
| Data pelanggan | PII leakage | Legal exposure, reputasi |

---

## 2. Skenario Serangan & Mitigasi

### 2.1 Price / Amount Manipulation
**Skenario:** Attacker intercept request checkout (lewat DevTools/proxy seperti Burp) dan mengubah `amount` atau `productId` sebelum sampai ke server, berharap bayar Rp1 untuk barang jutaan.

**Mitigasi (sudah didesain, wajib dipastikan konsisten):**
- Amount **tidak pernah** diterima dari client — selalu dihitung server dari harga produk di DB saat checkout (`processCheckout`).
- Zod schema menolak field asing (`amount`, `price`) jika dikirim client — gunakan `.strict()` bukan cuma `.parse()` biasa, supaya extra field ditolak eksplisit, bukan cuma diabaikan.
- Webhook **hanya membaca status**, tidak pernah membaca amount dari payload gateway untuk menentukan apa yang "dibayar" — bandingkan `externalId` → ambil amount dari Order di DB, bukan dari webhook payload.

### 2.2 Webhook Forgery (fake "payment success")
**Skenario:** Attacker kirim POST langsung ke `/api/webhook/xendit` atau `/api/webhook/stripe` dengan payload `status: PAID` untuk order miliknya yang belum dibayar.

**Mitigasi:**
- Signature verification **wajib** dan **timing-safe** (`crypto.timingSafeEqual`) — sudah didesain di README/PLANNING, pastikan tidak ada early-return sebelum verifikasi (hindari bug "verify setelah proses").
- Stripe: **raw body** dulu (`req.text()`), baru verify HMAC, baru `JSON.parse`. Kesalahan umum: Next.js body parser otomatis re-serialize JSON sehingga signature selalu mismatch — pastikan route pakai `export const runtime` config yang benar dan tidak ada middleware yang consume body duluan.
- **Reject webhook tanpa header signature** dengan 401, jangan fallback "proses tanpa verifikasi kalau header kosong" (bug klasik).
- Idempotency via `WebhookEvent.eventId` unique constraint di DB level (bukan cuma check-then-insert di application code — itu rentan race condition kalau webhook dikirim 2x bersamaan oleh gateway, hal yang normal terjadi).

### 2.3 Webhook Replay Attack
**Skenario:** Attacker capture webhook request yang valid (misal dari log yang bocor atau MITM sebelum HTTPS), lalu replay berkali-kali.

**Mitigasi:**
- `WebhookEvent.eventId` unique — replay dengan `eventId` sama akan gagal insert / no-op (idempotent).
- Tambahkan **timestamp tolerance check** untuk Stripe (`t=` di header `Stripe-Signature`) — tolak jika selisih > 5 menit dari waktu server, standar praktik Stripe untuk cegah replay window terlalu lebar.
- Pastikan endpoint webhook **hanya bisa diakses via HTTPS**, tidak ada fallback HTTP di production.

### 2.4 Webhook Race Condition (double processing)
**Skenario:** Gateway mengirim webhook `PAID` dua kali hampir bersamaan (retry policy gateway) sebelum request pertama selesai commit ke DB, sehingga stock ter-decrement dua kali.

**Mitigasi:**
- Update status Order **harus** cek status terminal dulu di dalam transaction (`prisma.$transaction` dengan `SELECT ... FOR UPDATE` semantics via Prisma's transaction isolation, atau `WHERE status = 'PENDING'` di update query supaya update kedua jadi no-op).
- Stock decrement **atomic** dalam transaction yang sama dengan update status order, bukan dua operasi terpisah.

### 2.5 Region Spoofing / Gateway Forcing
**Skenario:** Attacker (user region `intrl`) mencoba memaksa order-nya diproses via Xendit (IDR) untuk exploit selisih kurs, atau sebaliknya.

**Mitigasi:**
- Region **hanya** dari JWT/DB, tidak pernah dari body request, query param, atau header — ini sudah prinsip inti di README, jaga konsistensi di **semua** entry point (server action + REST API `api/payment/create` harus pakai sumber region yang sama, jangan sampai satu jalur lupa validasi).
- Audit: tambahkan test eksplisit "kirim `region`/`provider` di request body → harus diabaikan server" (bukan cuma test happy path).

### 2.6 JWT / Session Tampering & Staleness
**Skenario:** User ubah region di `/account` dari `intrl` → `id` untuk dapat harga lebih murah (kalau ada perbedaan harga per region), tapi JWT lama masih dipakai untuk checkout sampai token refresh.

**Mitigasi:**
- Setelah `setRegion()`, invalidate/refresh session token (force re-issue JWT), jangan tunggu next-auth default refresh interval.
- Kalau ada perbedaan harga per region, **jangan** simpan harga dalam token — selalu re-fetch harga produk dari DB saat checkout, gunakan region dari token hanya untuk pilih gateway, bukan untuk pricing logic yang sensitif.

### 2.7 Checkout Double-Submit / Order Duplication
**Skenario:** User double-click tombol bayar, atau retry otomatis dari client saat network lambat → dua Order dan dua session gateway dibuat untuk transaksi yang sama, stock ter-reserve dua kali.

**Mitigasi:**
- Tambahkan **idempotency key** di checkout server action (item #8 audit yang belum ada status di tracker — prioritaskan). Key bisa berupa hash dari `userId + cartSnapshot + timestamp-window`, disimpan sementara (Redis/DB) dengan TTL pendek.
- Disable tombol submit optimistically di client **dan** validasi idempoten di server — jangan andalkan client-side saja.

### 2.8 Stock Overselling (Race Condition di luar webhook)
**Skenario:** Dua user checkout produk stock=1 di waktu bersamaan sebelum payment — kalau stock di-decrement saat *checkout* bukan saat *payment confirmed*, bisa oversell; kalau di-decrement saat *payment confirmed*, bisa dua order pending untuk stock yang sama lalu keduanya dibayar.

**Mitigasi:**
- Reservasi stock sementara (soft-lock) saat checkout dengan TTL (misal 15 menit, expire otomatis jika belum dibayar), pakai atomic decrement (`UPDATE product SET stock = stock - 1 WHERE stock > 0` — cek `rowCount` hasil affected, bukan cuma trust tanpa cek) di dalam transaction.
- Background job untuk release reservasi stock dari order yang `EXPIRED`/`CANCELLED`.

### 2.9 API Key / Secret Leakage
**Skenario:** Key ter-commit ke git, ke-log di error message, atau bocor lewat client bundle (import salah tempat tanpa `server-only`).

**Mitigasi:**
- `server-only` import di semua file yang pegang secret — ini sudah didesain, tapi **tambahkan lint rule / CI check** yang scan apakah ada `STRIPE_SECRET_KEY`/`XENDIT_*_SECRET_KEY` ter-reference di file yang bisa masuk client bundle.
- **Rotasi key segera** kalau pernah ke-commit (status masih ⚠️ di tracker — ini prioritas #1, bukan opsional).
- Gunakan git-secrets atau pre-commit hook (`gitleaks`) untuk cegah commit key baru ke depan.
- Sanitasi error message ke client (`userMessage` terpisah dari raw error) — sudah didesain untuk Stripe/Xendit errors, pastikan **semua** error path (termasuk unhandled exception) tidak leak stack trace ke response production.

### 2.10 Rate Limit Bypass & Payment Endpoint Abuse
**Skenario:** Attacker spam endpoint `create checkout` untuk: (a) DoS quota API Xendit/Stripe (biaya per-call/rate limit provider), atau (b) enumerasi harga produk / testing carding di form checkout.

**Mitigasi:**
- Rate limit **per-user** (authenticated) dan **per-IP** (untuk cover multi-account abuse) — bukan cuma salah satu.
- Untuk endpoint publik `api/payment/create`: pertimbangkan serius untuk **dihapus** kalau tidak ada consumer eksternal yang butuh (mengurangi attack surface langsung), sesuai catatan tracker README 1.2 yang masih "pertimbangkan hapus".
- Tambahkan CAPTCHA/challenge (misal Cloudflare Turnstile) di form checkout kalau rate limit saja tidak cukup menahan bot.

### 2.11 CSRF pada Server Actions
**Skenario:** Next.js server actions punya proteksi CSRF built-in (origin check), tapi kalau ada custom API route (`api/payment/create`) yang tidak pakai server action, ini perlu proteksi manual.

**Mitigasi:**
- Pastikan `api/payment/create` cek `Origin`/`Referer` header atau pakai CSRF token eksplisit kalau route ini dipertahankan.
- Set `SameSite=Lax` atau `Strict` pada session cookie.

### 2.12 Open Redirect via `successUrl`/`cancelUrl`
**Skenario:** Kalau `successUrl`/`cancelUrl` yang dikirim ke Stripe/Xendit sebagian dibentuk dari input yang bisa dipengaruhi client (misal `returnTo` query param), attacker bisa bikin redirect ke domain phishing setelah "pembayaran sukses".

**Mitigasi:**
- `successUrl`/`cancelUrl` **selalu** dibentuk dari `NEXT_PUBLIC_APP_URL` + path statis di server, tidak pernah dari query param/body client tanpa whitelist domain.

### 2.13 PII Leakage via Failure/Redirect URL
**Skenario:** Order ID, email, atau detail transaksi bocor lewat query string yang ter-log di access log gateway/CDN, atau ter-share via referrer header ke pihak ketiga (analytics script) — ini item 2.6 di audit tracker yang masih ⚠️.

**Mitigasi:**
- Jangan taruh PII di query string redirect; gunakan `orderId` (bukan email/nama) yang di-`encodeURIComponent`, dan resolve detail lengkap dari server-side session/DB setelah redirect, bukan dari URL.
- Set `Referrer-Policy: strict-origin-when-cross-origin` di header.

### 2.14 Enumerasi Order/User via IDOR
**Skenario:** Attacker ganti `orderId` di URL status/success page untuk lihat order orang lain.

**Mitigasi:**
- Semua query order **wajib** filter `WHERE userId = session.user.id`, tidak cukup filter `WHERE id = orderId` saja.
- Gunakan ID non-sequential (cuid/uuid, bukan auto-increment integer) supaya tidak mudah ditebak — cek `prisma/schema.prisma` sudah pakai tipe ID apa.

### 2.15 Currency Conversion Abuse
**Skenario:** Kalau rate `IDR_TO_USD_RATE` env lupa diupdate lama dan attacker sadar rate stale menguntungkan mereka, atau kalau ada bug rounding yang bisa dieksploitasi berulang (salami attack) pada volume tinggi.

**Mitigasi:**
- Rounding **selalu** menguntungkan merchant (round up untuk konversi ke sen), bukan floor yang bisa dieksploitasi kalau di-agregasi banyak transaksi.
- Monitoring/alert kalau rate env tidak diupdate dalam X hari (lihat §4 di bawah).

---

## 3. Security Checklist Tambahan (di luar Production Test Checklist README)

- [ ] Security headers lengkap: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy` (termasuk `api.stripe.com`/`js.stripe.com`), `Referrer-Policy`.
- [ ] Dependency scanning (`npm audit` / Snyk/Dependabot) berjalan di CI, terutama karena `fetch` mentah dipakai (kurang dependency tapi tetap perlu cek dependency lain yang ada).
- [ ] Secret scanning (`gitleaks`) di pre-commit dan CI.
- [ ] Idempotency key untuk checkout server action (bukan cuma webhook).
- [ ] Atomic stock decrement dengan cek affected rows, bukan read-then-write terpisah.
- [ ] IDOR check: semua query order/profile filter by `session.user.id`.
- [ ] `successUrl`/`cancelUrl` dibentuk server-side dari whitelist domain.
- [ ] Rate limit per-user **dan** per-IP di endpoint payment.
- [ ] Timestamp tolerance check untuk Stripe webhook signature (anti-replay).
- [ ] Structured logging untuk semua event payment/webhook/error (audit item 2.7 — prioritas tinggi, belum selesai).
- [ ] Retention/archival policy untuk `WebhookEvent` (cegah tabel membengkak tanpa batas).
- [ ] Alert otomatis kalau `IDR_TO_USD_RATE` tidak diupdate dalam periode tertentu (kalau tetap pakai const, bukan API real-time).

---

## 4. Monitoring & Alerting (Rekomendasi)

Deteksi dini lebih murah daripada mitigasi setelah insiden. Minimal setup:

| Signal | Alert kalau |
|--------|-------------|
| Webhook signature gagal | Spike tiba-tiba (indikasi forgery attempt) |
| Order `PENDING` menumpuk tanpa jadi `PAID`/`EXPIRED` | Bug di sync status atau webhook down |
| Rate limit 429 spike | Kemungkinan bot/scraping/DoS attempt |
| Stock decrement gagal (affected rows = 0) berulang | Race condition atau bug logic |
| Webhook dari IP di luar range resmi Xendit/Stripe | Kemungkinan forgery (whitelist IP gateway kalau providers publish range-nya) |

---

## 5. Incident Response — Minimal Playbook

1. **Kompromi API key** → revoke/rotate di dashboard provider **segera**, cek log transaksi mencurigakan di periode kompromi, notify user terdampak jika ada order tidak sah.
2. **Webhook forgery terdeteksi** → cek `WebhookEvent` untuk pola anomali (eventId tidak dikenal, signature invalid berulang dari IP sama), block IP di WAF/proxy sementara.
3. **Oversell/stock inconsistency** → freeze checkout produk terdampak, rekonsiliasi manual dari Order + payment gateway dashboard sebagai source of truth kedua.

---

*Dokumen ini hidup — update tiap ada finding baru dari pentest, code review, atau insiden nyata. Silakan cross-reference status implementasi ke tracker `PLANNING.md` §19.*
