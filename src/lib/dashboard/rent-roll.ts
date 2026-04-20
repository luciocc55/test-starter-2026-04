import { db } from "@/lib/db";

export type RentRollStatus = "current" | "late" | "notice_given";

export interface RentRollRow {
  leaseId: string;
  tenantId: string | null;
  tenantName: string;
  unitLabel: string;
  monthlyRent: string;
  startDate: Date;
  endDate: Date;
  status: RentRollStatus;
  outstandingCents: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getRentRoll(userId: string): Promise<RentRollRow[]> {
  const today = new Date();
  const noticeCutoff = new Date(today.getTime() + 60 * DAY_MS);
  const lateCutoff = new Date(today.getTime() - 30 * DAY_MS);

  const leases = await db.lease.findMany({
    where: {
      userId,
      status: "active",
      tenantId: { not: null },
      unitId: { not: null },
    },
    include: {
      tenant: true,
      unit: { include: { property: true } },
    },
    orderBy: { startDate: "desc" },
  });

  const leaseIds = leases.map((l) => l.id);

  const [chargeSums, paymentSums, oldestUnpaid] = await Promise.all([
    db.charge.groupBy({
      by: ["leaseId"],
      where: { userId, leaseId: { in: leaseIds } },
      _sum: { amount: true },
    }),
    db.payment.groupBy({
      by: ["leaseId"],
      where: { userId, leaseId: { in: leaseIds } },
      _sum: { amount: true },
    }),
    db.charge.findMany({
      where: {
        userId,
        leaseId: { in: leaseIds },
        chargeDate: { lt: lateCutoff },
      },
      select: { leaseId: true, chargeDate: true, amount: true },
      orderBy: { chargeDate: "asc" },
    }),
  ]);

  const chargeByLease = new Map<string, number>();
  for (const c of chargeSums) {
    if (!c.leaseId) continue;
    chargeByLease.set(c.leaseId, Number(c._sum.amount ?? 0));
  }
  const paidByLease = new Map<string, number>();
  for (const p of paymentSums) {
    if (!p.leaseId) continue;
    paidByLease.set(p.leaseId, Number(p._sum.amount ?? 0));
  }
  const hasOldUnpaid = new Set<string>();
  for (const c of oldestUnpaid) {
    if (!c.leaseId) continue;
    const charged = chargeByLease.get(c.leaseId) ?? 0;
    const paid = paidByLease.get(c.leaseId) ?? 0;
    if (charged - paid > 0) hasOldUnpaid.add(c.leaseId);
  }

  return leases.map((l) => {
    const charged = chargeByLease.get(l.id) ?? 0;
    const paid = paidByLease.get(l.id) ?? 0;
    const outstandingCents = Math.round((charged - paid) * 100);

    let status: RentRollStatus = "current";
    if (l.endDate <= noticeCutoff) status = "notice_given";
    else if (hasOldUnpaid.has(l.id)) status = "late";

    const tenantName = l.tenant ? `${l.tenant.lastName}, ${l.tenant.firstName}` : "—";
    const unitLabel = l.unit ? `${l.unit.property.name} · ${l.unit.unitNumber}` : "—";

    return {
      leaseId: l.id,
      tenantId: l.tenantId,
      tenantName,
      unitLabel,
      monthlyRent: l.monthlyRent.toString(),
      startDate: l.startDate,
      endDate: l.endDate,
      status,
      outstandingCents,
    };
  });
}
