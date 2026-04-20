import { db } from "@/lib/db";
import type { FuzzyCluster } from "./normalize";

const SAMPLE_LIMIT = 10;

export async function buildPreview(batchId: string) {
  const batch = await db.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error(`ImportBatch ${batchId} not found`);
  if (batch.status !== "ready" && batch.status !== "committed") {
    throw new Error(`ImportBatch ${batchId} not ready (status=${batch.status})`);
  }

  const counts = batch.counts ? JSON.parse(batch.counts) : null;
  const fuzzyClusters: FuzzyCluster[] = batch.fuzzyClusters ? JSON.parse(batch.fuzzyClusters) : [];

  const [
    tenants, units, leases, charges, payments, workOrders,
  ] = await Promise.all([
    db.stagedTenant.findMany({ where: { importBatchId: batchId } }),
    db.stagedUnit.findMany({ where: { importBatchId: batchId } }),
    db.stagedLease.findMany({ where: { importBatchId: batchId } }),
    db.stagedCharge.findMany({ where: { importBatchId: batchId } }),
    db.stagedPayment.findMany({ where: { importBatchId: batchId } }),
    db.stagedWorkOrder.findMany({ where: { importBatchId: batchId } }),
  ]);

  const sample = <T extends { issues: string; rowNumber: number; externalId: string }>(
    rows: T[],
    key: string,
  ): { rowNumber: number; externalId: string }[] =>
    rows
      .filter((r) => JSON.parse(r.issues)[key])
      .slice(0, SAMPLE_LIMIT)
      .map((r) => ({ rowNumber: r.rowNumber, externalId: r.externalId }));

  return {
    batchId: batch.id,
    fileName: batch.fileName,
    status: batch.status,
    counts,
    flagged: {
      duplicateEmails: sample(tenants, "duplicateEmail"),
      malformedEmails: sample(tenants, "malformedEmail"),
      missingPhone: sample(tenants, "missingPhone"),
      dobParseFail: sample(tenants, "dobParseFail"),
      negativeSqft: sample(units, "negativeSqft"),
      orphanLeasesByTenant: sample(leases, "orphanTenant"),
      orphanLeasesByUnit: sample(leases, "orphanUnit"),
      endBeforeStart: sample(leases, "endBeforeStart"),
      overlappingLeases: sample(leases, "overlap"),
      orphanCharges: sample(charges, "orphanLease"),
      negativeCharges: sample(charges, "negativeAmount"),
      orphanPayments: sample(payments, "orphanLease"),
      zeroPayments: sample(payments, "zeroAmount"),
      splitPayments: sample(payments, "splitPayment"),
      orphanWorkOrders: sample(workOrders, "orphanUnit"),
      negativeWorkOrderCost: sample(workOrders, "negativeCost"),
    },
    fuzzyClusters,
  };
}
