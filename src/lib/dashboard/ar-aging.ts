import { db } from "@/lib/db";

export type ArBucketLabel = "0-30" | "31-60" | "61-90" | "90+";

export interface ArTenantRow {
  tenantId: string;
  tenantName: string;
  outstandingCents: number;
  oldestChargeDays: number;
}

export interface ArAgingBucket {
  label: ArBucketLabel;
  totalCents: number;
  tenants: ArTenantRow[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getArAging(userId: string): Promise<ArAgingBucket[]> {
  const today = new Date();

  const leases = await db.lease.findMany({
    where: { userId, tenantId: { not: null } },
    select: { id: true, tenantId: true, tenant: { select: { firstName: true, lastName: true } } },
  });
  if (leases.length === 0) return initBuckets();

  const leaseIds = leases.map((l) => l.id);

  const [chargeSums, paymentSums, oldestCharges] = await Promise.all([
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
    db.charge.groupBy({
      by: ["leaseId"],
      where: { userId, leaseId: { in: leaseIds } },
      _min: { chargeDate: true },
    }),
  ]);

  const chargeByLease = new Map<string, number>();
  const oldestByLease = new Map<string, Date>();
  for (const c of chargeSums) if (c.leaseId) chargeByLease.set(c.leaseId, Number(c._sum.amount ?? 0));
  for (const c of oldestCharges) if (c.leaseId && c._min.chargeDate) oldestByLease.set(c.leaseId, c._min.chargeDate);
  const paidByLease = new Map<string, number>();
  for (const p of paymentSums) if (p.leaseId) paidByLease.set(p.leaseId, Number(p._sum.amount ?? 0));

  const perTenant = new Map<string, ArTenantRow>();

  for (const lease of leases) {
    if (!lease.tenantId) continue;
    const charged = chargeByLease.get(lease.id) ?? 0;
    const paid = paidByLease.get(lease.id) ?? 0;
    const net = charged - paid;
    if (net <= 0) continue;
    const oldest = oldestByLease.get(lease.id) ?? today;
    const days = Math.max(0, Math.floor((today.getTime() - oldest.getTime()) / DAY_MS));

    const name = lease.tenant ? `${lease.tenant.lastName}, ${lease.tenant.firstName}` : "—";
    const existing = perTenant.get(lease.tenantId);
    const cents = Math.round(net * 100);
    if (existing) {
      existing.outstandingCents += cents;
      existing.oldestChargeDays = Math.max(existing.oldestChargeDays, days);
    } else {
      perTenant.set(lease.tenantId, {
        tenantId: lease.tenantId,
        tenantName: name,
        outstandingCents: cents,
        oldestChargeDays: days,
      });
    }
  }

  const buckets = initBuckets();
  for (const row of perTenant.values()) {
    const bucket = buckets.find((b) => b.label === labelFor(row.oldestChargeDays))!;
    bucket.tenants.push(row);
    bucket.totalCents += row.outstandingCents;
  }

  for (const b of buckets) {
    b.tenants.sort((a, c) => c.outstandingCents - a.outstandingCents);
  }

  return buckets;
}

function labelFor(days: number): ArBucketLabel {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function initBuckets(): ArAgingBucket[] {
  return [
    { label: "0-30", totalCents: 0, tenants: [] },
    { label: "31-60", totalCents: 0, tenants: [] },
    { label: "61-90", totalCents: 0, tenants: [] },
    { label: "90+", totalCents: 0, tenants: [] },
  ];
}
