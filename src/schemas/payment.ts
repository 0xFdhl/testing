import { z } from "zod";

const customerSchema = z.object({
  given_names: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  mobile_number: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)[0-9]{9,13}$/)
    .optional(),
});

const lineItemSchema = z.object({
  name: z.string().trim().min(1).max(255),
  quantity: z.number().int().min(1).max(99),
  price: z.number().int().min(1),
});

/**
 * Hanya menerima URL redirect ke host app sendiri (anti open redirect).
 * Mencegah attacker mengarahkan user ke domain phishing setelah bayar.
 */
const appOriginUrl = z
  .string()
  .url()
  .refine(
    (val) => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) return true;
      try {
        return new URL(val).host === new URL(appUrl).host;
      } catch {
        return false;
      }
    },
    { message: "Redirect URL harus domain app sendiri sesuai NEXT_PUBLIC_APP_URL" },
  );

export const createPaymentSchema = z
  .object({
    externalId: z
      .string()
      .trim()
      .min(3)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/, "externalId hanya huruf, angka, - dan _"),
    amount: z.number().int().min(1, "Amount minimal Rp 1"),
    description: z.string().trim().min(1).max(255),
    payerEmail: z.string().trim().email(),
    customer: customerSchema,
    items: z.array(lineItemSchema).min(1).max(50),
    successRedirectUrl: appOriginUrl,
    failureRedirectUrl: appOriginUrl,
    invoiceDurationSeconds: z.number().int().min(300).max(604_800).optional(),
  })
  .strict();

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
