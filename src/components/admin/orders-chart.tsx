"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  MonthlyCommerceTrend,
} from "@/lib/admin-analytics";

type OrdersChartProps = {
  data: MonthlyCommerceTrend[];
};

const series = [
  { key: "visitors", name: "Website visitors", color: "#c4a574" },
  { key: "checkouts", name: "Successful checkouts", color: "#8b5cf6" },
  { key: "totalItems", name: "Items sold", color: "#34d399" },
] as const;

export function OrdersChart({ data }: OrdersChartProps) {
  const hasData = data.some(
    (point) => point.visitors > 0 || point.checkouts > 0 || point.totalItems > 0,
  );

  if (!hasData) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 px-6 text-center">
        <div>
          <p className="text-sm font-medium text-zinc-300">No activity yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            Website visits, checkouts, and paid sales will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 16, right: 12, left: -20, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} stroke="#27272a" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="traffic"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#c4a574", fontSize: 11 }}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="commerce"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255, 255, 255, 0.035)" }}
            contentStyle={{
              backgroundColor: "#09090b",
              border: "1px solid #3f3f46",
              borderRadius: "12px",
              boxShadow: "0 16px 40px rgba(0,0,0,.35)",
            }}
            labelStyle={{ color: "#fafafa" }}
            itemStyle={{ fontSize: 12 }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{
              paddingBottom: 24,
              color: "#d4d4d8",
              fontSize: 11,
            }}
          />
          {series.map((item) => (
            <Line
              key={item.key}
              yAxisId={item.key === "visitors" ? "traffic" : "commerce"}
              type="monotone"
              dataKey={item.key}
              name={item.name}
              stroke={item.color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#09090b", strokeWidth: 2 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
