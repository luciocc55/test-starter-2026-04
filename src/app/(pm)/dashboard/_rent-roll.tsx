import { requireUser } from "@/lib/auth";
import { getRentRoll } from "@/lib/dashboard/rent-roll";
import { RentRollTable } from "./_rent-roll-table";

export async function RentRoll() {
  const user = await requireUser();
  const rows = await getRentRoll(user.id);

  const serialized = rows.map((r) => ({
    leaseId: r.leaseId,
    tenantName: r.tenantName,
    unitLabel: r.unitLabel,
    monthlyRent: r.monthlyRent,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate.toISOString().slice(0, 10),
    status: r.status,
    outstandingCents: r.outstandingCents,
  }));

  return (
    <div className="border border-[color:var(--color-line)] rounded-lg bg-[color:var(--color-surface)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--color-line)]">
        <h2 className="font-display text-xl text-[color:var(--color-ink)]">
          Rent roll ({serialized.length})
        </h2>
        <a
          href="/api/dashboard/rent-roll.csv"
          download
          className="text-sm text-[color:var(--color-accent)] hover:underline"
        >
          Export CSV ↓
        </a>
      </div>
      <RentRollTable rows={serialized} />
    </div>
  );
}
