"use client";

import { useState } from "react";

interface Row {
  leaseId: string;
  tenantName: string;
  unitLabel: string;
  monthlyRent: string;
  startDate: string;
  endDate: string;
  status: "current" | "late" | "notice_given";
  outstandingCents: number;
}

type SortKey = "tenantName" | "unitLabel" | "monthlyRent" | "startDate" | "endDate" | "status" | "outstandingCents";

const STATUS_LABEL: Record<Row["status"], string> = {
  current: "Current",
  late: "Late",
  notice_given: "Notice given",
};
const STATUS_COLOR: Record<Row["status"], string> = {
  current: "text-green-700 bg-green-50 border-green-200",
  late: "text-red-700 bg-red-50 border-red-200",
  notice_given: "text-amber-700 bg-amber-50 border-amber-200",
};

export function RentRollTable({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("tenantName");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const sorted = [...rows].sort((a, b) => {
    const x = a[sortKey];
    const y = b[sortKey];
    if (typeof x === "number" && typeof y === "number") return dir === "asc" ? x - y : y - x;
    return dir === "asc" ? String(x).localeCompare(String(y)) : String(y).localeCompare(String(x));
  });

  function toggle(key: SortKey) {
    if (sortKey === key) setDir(dir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setDir("asc"); }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[color:var(--color-muted)] text-left">
          <tr>
            <Th onClick={() => toggle("tenantName")} active={sortKey === "tenantName"} dir={dir}>Tenant</Th>
            <Th onClick={() => toggle("unitLabel")} active={sortKey === "unitLabel"} dir={dir}>Unit</Th>
            <Th onClick={() => toggle("monthlyRent")} active={sortKey === "monthlyRent"} dir={dir}>Rent</Th>
            <Th onClick={() => toggle("startDate")} active={sortKey === "startDate"} dir={dir}>Start</Th>
            <Th onClick={() => toggle("endDate")} active={sortKey === "endDate"} dir={dir}>End</Th>
            <Th onClick={() => toggle("status")} active={sortKey === "status"} dir={dir}>Status</Th>
            <Th onClick={() => toggle("outstandingCents")} active={sortKey === "outstandingCents"} dir={dir}>Outstanding</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--color-line)]">
          {sorted.map((r) => (
            <tr key={r.leaseId}>
              <td className="px-4 py-2">{r.tenantName}</td>
              <td className="px-4 py-2">{r.unitLabel}</td>
              <td className="px-4 py-2">${Number(r.monthlyRent).toLocaleString()}</td>
              <td className="px-4 py-2">{r.startDate}</td>
              <td className="px-4 py-2">{r.endDate}</td>
              <td className="px-4 py-2">
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </td>
              <td className="px-4 py-2 font-mono">
                {r.outstandingCents > 0 ? `$${(r.outstandingCents / 100).toLocaleString()}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, onClick, active, dir }: { children: React.ReactNode; onClick: () => void; active: boolean; dir: "asc" | "desc" }) {
  return (
    <th className="px-4 py-2 font-medium text-[color:var(--color-ink-soft)]">
      <button onClick={onClick} className="flex items-center gap-1 hover:text-[color:var(--color-ink)]">
        {children} {active && <span>{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}
