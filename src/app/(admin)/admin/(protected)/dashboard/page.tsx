import Link from "next/link";
import { redirect } from "next/navigation";
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
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    totalOrders,
    pendingOrders,
    todayRevenue,
    totalRevenue,
    monthRevenue,
    recentOrders,
    ordersLast7Days,
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
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, amount: true, status: true },
    }),
  ]);

  const ordersByDay: Record<string, { count: number; revenue: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    ordersByDay[d.toISOString().slice(0, 10)] = { count: 0, revenue: 0 };
  }

  for (const order of ordersLast7Days) {
    const key = order.createdAt.toISOString().slice(0, 10);
    if (ordersByDay[key]) {
      ordersByDay[key].count += 1;
      if (order.status === "PAID") ordersByDay[key].revenue += order.amount;
    }
  }

  const chartData = Object.entries(ordersByDay).map(([date, data]) => ({
    date,
    orders: data.count,
    revenue: data.revenue,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Dashboard summary for your store
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Products" value={totalProducts} />
        <StatCard title="Total Orders" value={totalOrders} />
        <StatCard title="Pending Orders" value={pendingOrders} />
        <StatCard
          title="Today&apos;s Revenue"
          value={formatIdr(todayRevenue._sum.amount ?? 0)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Total Revenue"
          value={formatIdr(totalRevenue._sum.amount ?? 0)}
          subtitle="All time paid orders"
        />
        <StatCard
          title="This Month Revenue"
          value={formatIdr(monthRevenue._sum.amount ?? 0)}
          subtitle={new Intl.DateTimeFormat("id-ID", {
            month: "long",
            year: "numeric",
          }).format(now)}
        />
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="mb-4 text-lg font-medium text-white">
          Orders — Last 7 Days
        </h2>
        <OrdersChart data={chartData} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-white">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <EmptyState message="No orders yet." />
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
