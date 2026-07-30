import { z } from "zod";
import { displaySizes } from "@/lib/products/types";

const customerFields = {
  customerName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama terlalu panjang"),
  customerEmail: z.string().trim().email("Email tidak valid"),
  customerPhone: z
    .string()
    .trim()
    .min(10, "Nomor HP tidak valid")
    .max(16, "Nomor HP tidak valid")
    .regex(
      /^(\+62|62|0)[0-9]{9,13}$/,
      "Gunakan format nomor Indonesia (08xx atau +62)",
    ),
};

export const cartLineItemSchema = z.object({
  productSlug: z.string().min(1),
  size: z.enum(displaySizes, { message: "Ukuran tidak valid" }),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "Minimal 1 item")
    .max(10, "Maksimal 10 item per produk"),
});

export const cartCheckoutSchema = z
  .object({
    items: z
      .array(cartLineItemSchema)
      .min(1, "Cart kosong")
      .max(20, "Terlalu banyak item"),
    ...customerFields,
  })
  .strict();

export type CartCheckoutInput = z.infer<typeof cartCheckoutSchema>;

export const checkoutSchema = z
  .object({
    productSlug: z.string().min(1, "Produk wajib dipilih"),
    size: z.enum(displaySizes, { message: "Ukuran tidak valid" }),
    quantity: z.coerce
      .number()
      .int("Jumlah harus bilangan bulat")
      .min(1, "Minimal 1 item")
      .max(10, "Maksimal 10 item per order"),
    ...customerFields,
  })
  .strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;
