import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default function LeasesPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-6 py-10 text-sm text-[color:var(--color-ink-soft)]">Loading leases…</div>}>
      <LeasesContent />
    </Suspense>
  );
}

async function LeasesContent() {
  const user = await requireUser();
  const leases = await db.lease.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
    include: { tenant: true, unit: true },
    take: 200,
  });
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-6">Leases ({leases.length})</h1>
      <table className="w-full text-sm border border-[color:var(--color-line)] bg-[color:var(--color-surface)] rounded-lg overflow-hidden">
        <thead className="bg-[color:var(--color-muted)]">
          <tr className="text-left">
            <th className="px-4 py-2">Tenant</th>
            <th className="px-4 py-2">Unit</th>
            <th className="px-4 py-2">Start</th>
            <th className="px-4 py-2">End</th>
            <th className="px-4 py-2">Rent</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Flag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--color-line)]">
          {leases.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-2">
                {l.tenant ? `${l.tenant.lastName}, ${l.tenant.firstName}` : <span className="text-red-600">orphan</span>}
              </td>
              <td className="px-4 py-2">{l.unit?.unitNumber ?? <span className="text-red-600">orphan</span>}</td>
              <td className="px-4 py-2">{new Date(l.startDate).toLocaleDateString()}</td>
              <td className="px-4 py-2">{new Date(l.endDate).toLocaleDateString()}</td>
              <td className="px-4 py-2">${String(l.monthlyRent)}</td>
              <td className="px-4 py-2">{l.status}</td>
              <td className="px-4 py-2 text-xs text-[color:var(--color-ink-soft)]">{l.importStatus ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
