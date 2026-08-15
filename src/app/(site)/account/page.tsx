import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/next-auth";
import { getOrdersByUserId } from "@/lib/orders";
import { Navbar } from "@/components/layout/navbar";
import { PushNotificationToggle } from "@/components/notifications/push-toggle";
import { formatIdr, formatDate } from "@/lib/format-admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account",
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  EXPIRED: "bg-red-100 text-red-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

const ORDERS_PER_PAGE = 10;

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { orders, total } = await getOrdersByUserId(session.user.id, ORDERS_PER_PAGE, 0);

  const totalOrders = total;
  const totalSpent = orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.amount, 0);
  const lastOrder = orders[0] ?? null;

  return (
    <main id="main-content" className="min-h-screen bg-white">
      <Navbar variant="solid" layout="shop" />

      <div className="mx-auto max-w-3xl px-5 pt-28 pb-20 md:px-10 md:pt-32">
        <div className="flex items-center gap-5">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name ?? "User"}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-zinc-200"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-bold text-zinc-500">
              {session.user.name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          )}
          <div>
            <h1 className="text-xl font-bold text-black">
              {session.user.name ?? "Customer"}
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {session.user.email}
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-200 p-4">
            <p className="text-2xl font-bold text-black">{totalOrders}</p>
            <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">Orders</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4">
            <p className="text-2xl font-bold text-black">{formatIdr(totalSpent)}</p>
            <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">Total Spent</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4">
            <p className="text-sm font-bold text-black">
              {lastOrder ? formatDate(lastOrder.createdAt) : "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">Last Order</p>
          </div>
        </div>

        <div className="mt-10">
          <PushNotificationToggle />
        </div>

        <div className="mt-12">
          <h2 className="text-lg font-bold text-black">Order History</h2>

          {orders.length === 0 ? (
            <div className="mt-6 rounded-lg border border-zinc-200 p-8 text-center">
              <p className="text-sm text-zinc-500">
                No orders yet. Start shopping to see your order history here.
              </p>
              <Link
                href="/shop"
                className="mt-4 inline-flex h-10 items-center rounded-md bg-black px-5 text-sm font-medium text-white"
              >
                Browse Shop
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {orders.map((order) => (
                <div
                  key={order.externalId}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black">
                      {order.externalId}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {formatDate(order.createdAt)} &middot;{" "}
                      {order.lineItems.length} item
                      {order.lineItems.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-4">
                    <span className="text-sm font-semibold text-black">
                      {formatIdr(order.amount)}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${statusStyles[order.status] ?? "bg-zinc-100 text-zinc-500"}`}
                    >
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {total > ORDERS_PER_PAGE && (
            <p className="mt-4 text-center text-sm text-zinc-500">
              Showing {ORDERS_PER_PAGE} of {total} orders
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
