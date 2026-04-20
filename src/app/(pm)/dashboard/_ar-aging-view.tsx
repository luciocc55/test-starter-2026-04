"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Tenant { tenantId: string; tenantName: string; outstandingCents: number; oldestChargeDays: number; }
interface Bucket { label: "0-30" | "31-60" | "61-90" | "90+"; totalCents: number; tenants: Tenant[]; }

const COLORS: Record<Bucket["label"], string> = {
  "0-30": "#22c55e",
  "31-60": "#eab308",
  "61-90": "#f97316",
  "90+":   "#dc2626",
};

export function ArAgingView({ buckets }: { buckets: Bucket[] }) {
  const [selected, setSelected] = useState<Bucket["label"]>(() => {
    const withData = buckets.find((b) => b.tenants.length > 0);
    return withData?.label ?? "0-30";
  });

  const chartData = buckets.map((b) => ({
    label: b.label,
    total: b.totalCents / 100,
  }));
  const currentBucket = buckets.find((b) => b.label === selected);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6 p-4">
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={chartData} onClick={(e) => {
            const p = e as unknown as { activePayload?: Array<{ payload: { label: Bucket["label"] } }> };
            const lbl = p.activePayload?.[0]?.payload.label;
            if (lbl) setSelected(lbl);
          }}>
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(v) => `$${Number(v).toLocaleString()}`} width={80} />
            <Tooltip formatter={(v) => `$${Number(v ?? 0).toLocaleString()}`} />
            <Bar dataKey="total" cursor="pointer">
              {chartData.map((d) => (
                <Cell key={d.label} fill={COLORS[d.label as Bucket["label"]]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <div className="text-xs uppercase tracking-wider text-[color:var(--color-ink-soft)] mb-2 px-2">
          Bucket <span className="text-[color:var(--color-ink)] font-medium">{selected}</span>
          {" · "}
          {currentBucket ? `${currentBucket.tenants.length} tenant${currentBucket.tenants.length === 1 ? "" : "s"}` : ""}
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-[color:var(--color-ink-soft)]">
            <tr>
              <th className="px-2 py-1 font-normal">Tenant</th>
              <th className="px-2 py-1 font-normal">Days</th>
              <th className="px-2 py-1 font-normal text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--color-line)]">
            {(currentBucket?.tenants ?? []).map((t) => (
              <tr key={t.tenantId}>
                <td className="px-2 py-1">{t.tenantName}</td>
                <td className="px-2 py-1 font-mono text-xs">{t.oldestChargeDays}</td>
                <td className="px-2 py-1 font-mono text-right">${(t.outstandingCents / 100).toLocaleString()}</td>
              </tr>
            ))}
            {(currentBucket?.tenants.length ?? 0) === 0 && (
              <tr><td colSpan={3} className="px-2 py-3 text-xs text-[color:var(--color-ink-soft)]">No tenants in this bucket.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
