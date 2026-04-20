"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Month { month: string; categories: Record<string, number>; total: number; }

const PALETTE = ["#0F3D91", "#1a52c4", "#f97316", "#22c55e", "#eab308", "#7c3aed", "#db2777", "#06b6d4"];

export function ExpenseChartView({ months }: { months: Month[] }) {
  const categories = Array.from(
    new Set(months.flatMap((m) => Object.keys(m.categories))),
  ).sort();

  const chartData = months.map((m) => {
    const row: Record<string, string | number> = { month: m.month };
    for (const c of categories) row[c] = m.categories[c] ?? 0;
    return row;
  });

  return (
    <div className="p-4 h-80">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `$${Number(v).toLocaleString()}`} width={80} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `$${Number(v ?? 0).toLocaleString()}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {categories.map((cat, i) => (
            <Bar key={cat} dataKey={cat} stackId="expenses" fill={PALETTE[i % PALETTE.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
