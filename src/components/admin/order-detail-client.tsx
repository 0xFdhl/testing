"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  updateOrderStatusAction,
  type ActionResult,
} from "@/lib/admin-actions";
import { formatDate, formatIdr } from "@/lib/format-admin";
import type { OrderStatus } from "@/generated/prisma/enums";

type LineItem = {
  productSlug: string;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  image?: string;
};

type OrderDetailProps = {
  order: {
    externalId: string;
    status: OrderStatus;
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    invoiceUrl: string | null;
    xenditInvoiceId: string | null;
    createdAt: string;
    paidAt: string | null;
    expiredAt: string | null;
    cancelledAt: string | null;
    lineItems: LineItem[];
  };
};

const statuses: OrderStatus[] = ["PENDING", "PAID", "EXPIRED", "CANCELLED"];

export function OrderDetailClient({ order }: OrderDetailProps) {
  const [state, formAction, pending] = useActionState<
    ActionResult,
    FormData
  >(updateOrderStatusAction, { success: false });
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);

  function handleStatusUpdate() {
    const formData = new FormData();
    formData.set("externalId", order.externalId);
    formData.set("status", newStatus);
    formAction(formData);
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/orders"
          className="rounded-sm text-sm text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          ← Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">
            {order.externalId}
          </h1>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          Order status updated.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="text-lg font-medium text-white">Customer</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Name</dt>
              <dd>{order.customerName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Email</dt>
              <dd>{order.customerEmail}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Phone</dt>
              <dd>{order.customerPhone}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h2 className="text-lg font-medium text-white">Payment</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Amount</dt>
              <dd>{formatIdr(order.amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Invoice</dt>
              <dd>
                {order.invoiceUrl ? (
                  <a
                    href={order.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm text-zinc-100 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    View invoice
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Xendit ID</dt>
              <dd className="font-mono text-xs">{order.xenditInvoiceId ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Created</dt>
              <dd>{formatDate(order.createdAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Paid at</dt>
              <dd>{formatDate(order.paidAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Expired at</dt>
              <dd>{formatDate(order.expiredAt)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-lg font-medium text-white">Line Items</h2>
        <div className="space-y-3">
          {order.lineItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border border-zinc-800 p-3"
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.productName}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-500">
                  N/A
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-white">{item.productName}</p>
                <p className="text-sm text-zinc-500">
                  {item.size} × {item.quantity}
                </p>
              </div>
              <p className="text-sm text-zinc-300">
                {formatIdr(item.unitPrice * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="mb-4 text-lg font-medium text-white">Manual Status Override</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className="text-sm text-zinc-400">New status</span>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              className="block rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <ConfirmDialog
            title="Update order status"
            description="Are you sure you want to manually override this order's status?"
            confirmLabel="Update status"
            onConfirm={handleStatusUpdate}
            trigger={
              <button
                type="button"
                disabled={pending || newStatus === order.status}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                {pending ? "Updating…" : "Update status"}
              </button>
            }
          />
        </div>
      </section>
    </div>
  );
}
