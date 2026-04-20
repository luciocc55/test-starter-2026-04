import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

type FlaggedRow = { id: string; importStatus: string | null; externalId?: string | null };

export default function FlaggedPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-6 py-10 text-sm text-[color:var(--color-ink-soft)]">Loading flagged rows…</div>}>
      <FlaggedContent />
    </Suspense>
  );
}

async function FlaggedContent() {
  const user = await requireUser();
  const [tenants, leases, charges, payments, workOrders, units] = await Promise.all([
    db.tenant.findMany({ where: { userId: user.id, importStatus: { not: null } }, take: 100 }),
    db.lease.findMany({ where: { userId: user.id, importStatus: { not: null } }, take: 100 }),
    db.charge.findMany({ where: { userId: user.id, importStatus: { not: null } }, take: 100 }),
    db.payment.findMany({ where: { userId: user.id, importStatus: { not: null } }, take: 100 }),
    db.workOrder.findMany({ where: { userId: user.id, importStatus: { not: null } }, take: 100 }),
    db.unit.findMany({ where: { userId: user.id, importStatus: { not: null } }, take: 100 }),
  ]);

  const total = tenants.length + leases.length + charges.length + payments.length + workOrders.length + units.length;

  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-2">Flagged rows ({total})</h1>
      <p className="text-sm text-[color:var(--color-ink-soft)] mb-8">
        Rows imported with quality warnings. Review and resolve manually.
      </p>
      {(
        [
          { label: "Tenants", rows: tenants as FlaggedRow[] },
          { label: "Units", rows: units as FlaggedRow[] },
          { label: "Leases", rows: leases as FlaggedRow[] },
          { label: "Charges", rows: charges as FlaggedRow[] },
          { label: "Payments", rows: payments as FlaggedRow[] },
          { label: "Work orders", rows: workOrders as FlaggedRow[] },
        ] as const
      ).map(({ label, rows }) => (
        <div key={label} className="mb-6">
          <h2 className="text-sm uppercase tracking-widest text-[color:var(--color-ink-soft)] mb-2">
            {label} ({rows.length})
          </h2>
          <ul className="text-xs font-mono text-[color:var(--color-ink-soft)] space-y-1">
            {rows.map((r) => (
              <li key={r.id}>
                {r.importStatus} · {r.externalId ?? r.id}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
