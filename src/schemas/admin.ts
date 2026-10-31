import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const productCategories = [
  "jacket",
  "snowboard",
  "ski",
  "goggles",
] as const;

export const displaySizes = ["XS", "S", "M", "L", "XL"] as const;

/**
 * Product images must use absolute URLs. Local image assets are not stored in this project.
 */
export const imageRef = z
  .string()
  .min(1, "Image ref is required")
  .refine(
    (v) =>
      /^https:\/\/.+/i.test(v) ||
      (process.env.NODE_ENV !== "production" && /^http:\/\/.+/i.test(v)),
    "Must be an absolute HTTPS URL",
  );

export const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  description: z.string(),
  category: z.enum(productCategories),
  price: z.coerce.number().int().positive("Price must be positive"),
  images: z.array(imageRef).min(1, "At least one image"),
  stock: z.record(z.string(), z.coerce.number().int().min(0)),
  badge: z.string().optional(),
  colorLabel: z.string().optional(),
  fitNote: z.string().optional(),
  sizingInfo: z.array(z.string()),
  shippingInfo: z.array(z.string()),
  returnsInfo: z.array(z.string()),
});

export const orderStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "EXPIRED",
  "CANCELLED",
]);

export const updateOrderStatusSchema = z.object({
  externalId: z.string().min(1),
  status: orderStatusSchema,
});

export const settingsSchema = z.object({
  xenditMode: z.enum(["test", "live"]),
  appUrl: z.url("Invalid app URL"),
  adminsCanEditPhotos: z.enum(["on", "off"]),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
