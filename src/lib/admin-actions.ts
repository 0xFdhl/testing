"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@/generated/prisma/enums";
import {
  authenticateAdmin,
  clearSessionCookie,
  createSessionToken,
  requireAdmin,
  setSessionCookie,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { setXenditMode } from "@/lib/xendit/config";
import {
  loginSchema,
  productFormSchema,
  settingsSchema,
  updateOrderStatusSchema,
  displaySizes,
} from "@/schemas/admin";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const rateLimit = checkRateLimit("admin-login", 5, 60_000);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many attempts. Try again later." };
  }

  const session = await authenticateAdmin(parsed.data.email, parsed.data.password);
  if (!session) {
    return { success: false, error: "Invalid email or password" };
  }

  const token = await createSessionToken(session);
  await setSessionCookie(token);
  redirect("/admin/dashboard");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function createProductAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const raw = parseProductFormData(formData);
  const parsed = productFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  const sizes = displaySizes.filter((s) => s in data.stock);

  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        category: data.category,
        price: data.price,
        images: data.images,
        sizes,
        stock: data.stock,
        badge: data.badge || null,
        colorLabel: data.colorLabel || null,
        fitNote: data.fitNote || null,
        sizingInfo: data.sizingInfo.filter(Boolean),
        shippingInfo: data.shippingInfo.filter(Boolean),
        returnsInfo: data.returnsInfo.filter(Boolean),
      },
    });

    await logAudit(session, "CREATE", "Product", product.id, { name: product.name });
    revalidatePath("/admin/products");
    redirect(`/admin/products/${product.id}/edit`);
  } catch {
    return { success: false, error: "Failed to create product. Slug may already exist." };
  }
}

export async function updateProductAction(
  productId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const raw = parseProductFormData(formData);
  const parsed = productFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  const sizes = displaySizes.filter((s) => s in data.stock);

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        category: data.category,
        price: data.price,
        images: data.images,
        sizes,
        stock: data.stock,
        badge: data.badge || null,
        colorLabel: data.colorLabel || null,
        fitNote: data.fitNote || null,
        sizingInfo: data.sizingInfo.filter(Boolean),
        shippingInfo: data.shippingInfo.filter(Boolean),
        returnsInfo: data.returnsInfo.filter(Boolean),
      },
    });

    await logAudit(session, "UPDATE", "Product", product.id, { name: product.name });
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}/edit`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update product" };
  }
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  const session = await requireAdmin();

  try {
    const product = await prisma.product.delete({ where: { id: productId } });
    await logAudit(session, "DELETE", "Product", productId, { name: product.name });
    revalidatePath("/admin/products");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete product" };
  }
}

export async function updateOrderStatusAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = updateOrderStatusSchema.safeParse({
    externalId: formData.get("externalId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  const { externalId, status } = parsed.data;
  const now = new Date();

  const updateData: {
    status: OrderStatus;
    paidAt?: Date;
    expiredAt?: Date;
    cancelledAt?: Date;
  } = { status };

  if (status === "PAID") updateData.paidAt = now;
  if (status === "EXPIRED") updateData.expiredAt = now;
  if (status === "CANCELLED") updateData.cancelledAt = now;

  try {
    await prisma.order.update({
      where: { externalId },
      data: updateData,
    });

    await logAudit(session, "UPDATE_STATUS", "Order", externalId, { status });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${externalId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update order status" };
  }
}

export async function retryWebhookAction(eventId: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const event = await prisma.webhookEvent.findUnique({ where: { eventId } });
  if (!event) return { success: false, error: "Webhook event not found" };
  if (event.status === "processed") {
    return { success: false, error: "Event already processed" };
  }

  try {
    const payload = event.payload as { external_id?: string; status?: string } | null;
    if (!payload?.external_id || !payload?.status) {
      return { success: false, error: "Invalid event payload" };
    }

    const { isPaidStatus } = await import("@/lib/xendit");
    const { getOrderByExternalId, transitionOrderStatus } = await import("@/lib/orders");

    const order = await getOrderByExternalId(payload.external_id);
    if (order && order.status === "PENDING") {
      if (isPaidStatus(payload.status as "PENDING" | "PAID" | "SETTLED" | "EXPIRED")) {
        await transitionOrderStatus(payload.external_id, "PENDING", "PAID", { paidAt: new Date() });
      } else if (payload.status === "EXPIRED") {
        await transitionOrderStatus(payload.external_id, "PENDING", "EXPIRED", { expiredAt: new Date() });
      }
    }

    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        status: "processed",
        processedAt: new Date(),
      },
    });

    await logAudit(session, "RETRY", "WebhookEvent", eventId);
    revalidatePath("/admin/webhooks");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to retry webhook" };
  }
}

export async function updateSettingsAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = settingsSchema.safeParse({
    xenditMode: formData.get("xenditMode"),
    appUrl: formData.get("appUrl"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { xenditMode, appUrl } = parsed.data;

  await prisma.appSetting.upsert({
    where: { key: "xendit_mode" },
    create: { key: "xendit_mode", value: xenditMode, updatedBy: session.email },
    update: { value: xenditMode, updatedBy: session.email },
  });

  await prisma.appSetting.upsert({
    where: { key: "app_url" },
    create: { key: "app_url", value: appUrl, updatedBy: session.email },
    update: { value: appUrl, updatedBy: session.email },
  });

  setXenditMode(xenditMode);

  await logAudit(session, "UPDATE", "Settings", undefined, { xenditMode, appUrl });
  revalidatePath("/admin/settings");
  return { success: true };
}

function parseProductFormData(formData: FormData) {
  const images = formData.getAll("images").map(String).filter(Boolean);
  const stock: Record<string, number> = {};
  for (const size of displaySizes) {
    stock[size] = Number(formData.get(`stock_${size}`) ?? 0);
  }

  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    category: formData.get("category"),
    price: formData.get("price"),
    images,
    stock,
    badge: formData.get("badge") || undefined,
    colorLabel: formData.get("colorLabel") || undefined,
    fitNote: formData.get("fitNote") || undefined,
    sizingInfo: formData.getAll("sizingInfo").map(String),
    shippingInfo: formData.getAll("shippingInfo").map(String),
    returnsInfo: formData.getAll("returnsInfo").map(String),
  };
}

export async function getEffectiveXenditMode(): Promise<"test" | "live"> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "xendit_mode" },
  });
  if (setting?.value === "live" || setting?.value === "test") {
    return setting.value;
  }
  return process.env.XENDIT_MODE === "live" ? "live" : "test";
}

export async function getEffectiveAppUrl(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "app_url" },
  });
  return setting?.value ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
