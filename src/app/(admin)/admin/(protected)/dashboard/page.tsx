import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Banknote,
  Clock3,
  PackageCheck,
  WalletCards,
} from "lucide-react";
import { OrdersChart } from "@/components/admin/orders-chart";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
} from "@/components/admin/data-table";
import { formatDate, formatIdr } from "@/lib/format-admin";
import {
  buildMonthlyCommerceTrend,
  buildMonthlyProductSales,
} from "@/lib/admin-analytics";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlyVisitorCounts } from "@/lib/store-visitors";
import {
  getMonthKey,
  getSalesPeriodStart,
  STORE_TIME_ZONE,
} from "@/lib/store-time";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const salesPeriodStart = getSalesPeriodStart(now);

  const [
    totalProducts,
    totalOrders,
    pendingOrders,
    todayRevenue,
    totalRevenue,
    monthRevenue,
    recentOrders,
    paidOrdersForChart,
    visitorCountsForChart,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.aggregate({
      where: { status: "PAID", paidAt: { gte: startOfDay } },
      _sum: { amount: true },
    }),
    prisma.order.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.order.aggregate({
      where: { status: "PAID", paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.findMany({
      where: {
        status: "PAID",
        OR: [
          { paidAt: { gte: salesPeriodStart } },
          { paidAt: null, createdAt: { gte: salesPeriodStart } },
        ],
      },
      select: { createdAt: true, paidAt: true, lineItems: true },
    }),
    getMonthlyVisitorCounts(getMonthKey(salesPeriodStart)),
  ]);

  const productSales = buildMonthlyProductSales(paidOrdersForChart, now);
  const commerceTrend = buildMonthlyCommerceTrend(
    productSales.data,
    paidOrdersForChart.map((order) => order.paidAt ?? order.createdAt),
    visitorCountsForChart,
  );
  const currentMonthLabel = new Intl.DateTimeFormat("id-ID", {
    timeZone: STORE_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-gold">
            Store performance
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Overview
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {totalOrders} orders across {totalProducts} products
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          View all orders
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatIdr(totalRevenue._sum.amount ?? 0)}
          subtitle="All-time paid orders"
          icon={<WalletCards className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          title="This Month"
          value={formatIdr(monthRevenue._sum.amount ?? 0)}
          subtitle={`${formatIdr(todayRevenue._sum.amount ?? 0)} today`}
          icon={<Banknote className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          title="Items Sold"
          value={productSales.totalItemsSold}
          subtitle="Paid orders · last 12 months"
          icon={<PackageCheck className="h-5 w-5" />}
          accent="sky"
        />
        <StatCard
          title="Pending Orders"
          value={pendingOrders}
          subtitle={`${totalOrders} orders in total`}
          icon={<Clock3 className="h-5 w-5" />}
          accent="violet"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-800/80 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Store growth</h2>
              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Monthly
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Unique website visitors, successful checkouts, and paid items during the last 12 months
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
              <span className="text-zinc-500">Top product </span>
              <span className="font-medium text-zinc-200">
                {productSales.topProduct?.name ?? "—"}
              </span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
              <span className="text-zinc-500">Period </span>
              <span className="font-medium text-zinc-200">to {currentMonthLabel}</span>
            </div>
          </div>
        </div>
        <div className="px-3 pb-3 pt-2 sm:px-5 sm:pb-5">
          <OrdersChart data={commerceTrend} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent orders</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Latest activity from your store</p>
          </div>
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-brand-gold hover:text-white"
          >
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No orders yet." />
          </div>
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>External ID</DataTableHeaderCell>
                <DataTableHeaderCell>Customer</DataTableHeaderCell>
                <DataTableHeaderCell>Amount</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Date</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {recentOrders.map((order) => (
                <DataTableRow key={order.id}>
                  <DataTableCell>
                    <Link
                      href={`/admin/orders/${order.externalId}`}
                      className="text-zinc-100 hover:underline"
                    >
                      {order.externalId}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>{order.customerName}</DataTableCell>
                  <DataTableCell>{formatIdr(order.amount)}</DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={order.status} />
                  </DataTableCell>
                  <DataTableCell>{formatDate(order.createdAt)}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </section>
    </div>
  );
}
