import { db } from "@/lib/db";
import type { FuzzyCluster } from "./normalize";

const CHUNK = 1000;

export interface ClusterDecision {
  clusterId: string;
  merge: boolean;
  canonical: string;
}

export async function commitImport(
  batchId: string,
  userId: string,
  clusterDecisions: ClusterDecision[],
) {
  const batch = await db.importBatch.update({
    where: { id: batchId },
    data: { status: "committing" },
  });
  if (batch.userId !== userId) throw new Error("Cross-user commit forbidden");

  const fuzzyClusters: FuzzyCluster[] = batch.fuzzyClusters ? JSON.parse(batch.fuzzyClusters) : [];

  const variantToCanonical = new Map<string, string>();
  for (const cluster of fuzzyClusters) {
    const decision = clusterDecisions.find((d) => d.clusterId === cluster.clusterId);
    const merge = decision?.merge ?? cluster.defaultMerge;
    const canonical = decision?.canonical ?? cluster.canonical;
    for (const variant of cluster.variants) {
      variantToCanonical.set(variant, merge ? canonical : variant);
    }
  }

  try {
    await upsertProperties(batchId, userId, variantToCanonical);
    await upsertUnits(batchId, userId, variantToCanonical);
    await upsertTenants(batchId, userId);
    await upsertLeases(batchId, userId);
    await upsertCharges(batchId, userId);
    await upsertPayments(batchId, userId);
    await upsertWorkOrders(batchId, userId);

    await db.importBatch.update({
      where: { id: batchId },
      data: { status: "committed", committedAt: new Date() },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.importBatch.update({
      where: { id: batchId },
      data: { status: "failed", errorMessage: msg },
    });
    throw err;
  }
}

async function upsertProperties(
  batchId: string,
  userId: string,
  variantToCanonical: Map<string, string>,
) {
  const staged = await db.stagedUnit.findMany({ where: { importBatchId: batchId } });
  const canonicalNames = new Set<string>();
  for (const s of staged) {
    const raw = s.propertyName;
    const canonical = variantToCanonical.get(raw) ?? raw;
    canonicalNames.add(canonical);
  }
  for (const canonical of canonicalNames) {
    const normalized = canonical.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
    await db.property.upsert({
      where: { userId_normalizedName: { userId, normalizedName: normalized } },
      create: { userId, name: canonical, normalizedName: normalized },
      update: { name: canonical },
    });
  }
}

async function upsertUnits(
  batchId: string,
  userId: string,
  variantToCanonical: Map<string, string>,
) {
  const staged = await db.stagedUnit.findMany({ where: { importBatchId: batchId } });
  for (let i = 0; i < staged.length; i += CHUNK) {
    const slice = staged.slice(i, i + CHUNK);
    await db.$transaction(async (tx) => {
      for (const s of slice) {
        const canonical = variantToCanonical.get(s.propertyName) ?? s.propertyName;
        const normalized = canonical.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
        const property = await tx.property.findUniqueOrThrow({
          where: { userId_normalizedName: { userId, normalizedName: normalized } },
        });

        const issues = JSON.parse(s.issues) as Record<string, unknown>;
        const importStatus = deriveStatus(issues);

        const unit = await tx.unit.upsert({
          where: {
            sourceSystem_externalId_userId: {
              sourceSystem: "buildium",
              externalId: s.externalId,
              userId,
            },
          },
          create: {
            userId,
            propertyId: property.id,
            unitNumber: s.unitNumber,
            bedrooms: toInt(s.bedrooms),
            bathrooms: toFloat(s.bathrooms),
            squareFeet: toInt(s.squareFeet),
            monthlyRentTarget: s.monthlyRentTarget ? s.monthlyRentTarget : null,
            status: s.status,
            importStatus,
            importFlags: s.issues,
            externalId: s.externalId,
            sourceSystem: "buildium",
          },
          update: {
            propertyId: property.id,
            unitNumber: s.unitNumber,
            bedrooms: toInt(s.bedrooms),
            bathrooms: toFloat(s.bathrooms),
            squareFeet: toInt(s.squareFeet),
            monthlyRentTarget: s.monthlyRentTarget ? s.monthlyRentTarget : null,
            status: s.status,
            importStatus,
            importFlags: s.issues,
          },
        });

        await tx.stagedUnit.update({
          where: { id: s.id },
          data: { resolvedUnitId: unit.id, resolvedPropertyId: property.id },
        });
      }
    });
  }
}

async function upsertTenants(batchId: string, userId: string) {
  const staged = await db.stagedTenant.findMany({ where: { importBatchId: batchId } });
  for (let i = 0; i < staged.length; i += CHUNK) {
    const slice = staged.slice(i, i + CHUNK);
    await db.$transaction(async (tx) => {
      for (const s of slice) {
        const issues = JSON.parse(s.issues) as Record<string, unknown>;
        const importStatus = deriveStatus(issues);
        const emailOk = !issues.malformedEmail && s.email;

        let tenantId: string;

        if (emailOk) {
          const t = await tx.tenant.upsert({
            where: { userId_email: { userId, email: s.email } },
            create: {
              userId,
              firstName: s.firstName,
              lastName: s.lastName,
              email: s.email,
              phone: s.phone || null,
              dateOfBirth: s.parsedDob ?? null,
              status: s.status,
              notes: s.notes || null,
              importStatus,
              importFlags: s.issues,
            },
            update: {
              firstName: s.firstName,
              lastName: s.lastName,
              phone: s.phone || null,
              dateOfBirth: s.parsedDob ?? null,
              status: s.status,
              notes: s.notes || null,
              importStatus,
              importFlags: s.issues,
            },
          });
          tenantId = t.id;
        } else {
          const existingRef = await tx.tenantExternalRef.findUnique({
            where: { sourceSystem_externalId: { sourceSystem: "buildium", externalId: s.externalId } },
          });
          if (existingRef) {
            tenantId = existingRef.tenantId;
            await tx.tenant.update({
              where: { id: tenantId },
              data: {
                firstName: s.firstName,
                lastName: s.lastName,
                phone: s.phone || null,
                dateOfBirth: s.parsedDob ?? null,
                status: s.status,
                notes: s.notes || null,
                importStatus,
                importFlags: s.issues,
              },
            });
          } else {
            const created = await tx.tenant.create({
              data: {
                userId,
                firstName: s.firstName,
                lastName: s.lastName,
                email: null,
                phone: s.phone || null,
                dateOfBirth: s.parsedDob ?? null,
                status: s.status,
                notes: s.notes || null,
                importStatus,
                importFlags: s.issues,
              },
            });
            tenantId = created.id;
          }
        }

        await tx.tenantExternalRef.upsert({
          where: { sourceSystem_externalId: { sourceSystem: "buildium", externalId: s.externalId } },
          create: {
            tenantId,
            sourceSystem: "buildium",
            externalId: s.externalId,
            importBatchId: batchId,
          },
          update: { tenantId, importBatchId: batchId },
        });

        await tx.stagedTenant.update({
          where: { id: s.id },
          data: { resolvedTenantId: tenantId },
        });
      }
    });
  }
}

async function upsertLeases(batchId: string, userId: string) {
  const staged = await db.stagedLease.findMany({ where: { importBatchId: batchId } });
  for (let i = 0; i < staged.length; i += CHUNK) {
    const slice = staged.slice(i, i + CHUNK);
    await db.$transaction(async (tx) => {
      for (const s of slice) {
        const issues = JSON.parse(s.issues) as Record<string, unknown>;
        const importStatus = deriveStatus(issues);

        const tenantRef = await tx.tenantExternalRef.findUnique({
          where: { sourceSystem_externalId: { sourceSystem: "buildium", externalId: s.tenantExternalId } },
        });
        const unit = await tx.unit.findUnique({
          where: {
            sourceSystem_externalId_userId: {
              sourceSystem: "buildium",
              externalId: s.unitExternalId,
              userId,
            },
          },
        });

        if (!s.parsedStart || !s.parsedEnd) continue;

        const lease = await tx.lease.upsert({
          where: {
            sourceSystem_externalId_userId: {
              sourceSystem: "buildium",
              externalId: s.externalId,
              userId,
            },
          },
          create: {
            userId,
            tenantId: tenantRef?.tenantId ?? null,
            unitId: unit?.id ?? null,
            startDate: s.parsedStart,
            endDate: s.parsedEnd,
            monthlyRent: s.monthlyRent,
            securityDeposit: s.securityDeposit,
            status: s.status,
            importStatus,
            importFlags: s.issues,
            externalId: s.externalId,
            sourceSystem: "buildium",
          },
          update: {
            tenantId: tenantRef?.tenantId ?? null,
            unitId: unit?.id ?? null,
            startDate: s.parsedStart,
            endDate: s.parsedEnd,
            monthlyRent: s.monthlyRent,
            securityDeposit: s.securityDeposit,
            status: s.status,
            importStatus,
            importFlags: s.issues,
          },
        });

        await tx.stagedLease.update({
          where: { id: s.id },
          data: { resolvedLeaseId: lease.id },
        });
      }
    });
  }
}

async function upsertCharges(batchId: string, userId: string) {
  const staged = await db.stagedCharge.findMany({ where: { importBatchId: batchId } });
  for (let i = 0; i < staged.length; i += CHUNK) {
    const slice = staged.slice(i, i + CHUNK);
    await db.$transaction(async (tx) => {
      for (const s of slice) {
        const issues = JSON.parse(s.issues) as Record<string, unknown>;
        const importStatus = deriveStatus(issues);

        const lease = await tx.lease.findUnique({
          where: {
            sourceSystem_externalId_userId: {
              sourceSystem: "buildium",
              externalId: s.leaseExternalId,
              userId,
            },
          },
        });

        if (!s.parsedDate || s.parsedAmount === null) continue;

        const charge = await tx.charge.upsert({
          where: {
            sourceSystem_externalId_userId: {
              sourceSystem: "buildium",
              externalId: s.externalId,
              userId,
            },
          },
          create: {
            userId,
            leaseId: lease?.id ?? null,
            chargeDate: s.parsedDate,
            amount: s.parsedAmount,
            type: s.type,
            description: s.description,
            importStatus,
            importFlags: s.issues,
            externalId: s.externalId,
            sourceSystem: "buildium",
          },
          update: {
            leaseId: lease?.id ?? null,
            chargeDate: s.parsedDate,
            amount: s.parsedAmount,
            type: s.type,
            description: s.description,
            importStatus,
            importFlags: s.issues,
          },
        });
        await tx.stagedCharge.update({
          where: { id: s.id },
          data: { resolvedChargeId: charge.id },
        });
      }
    });
  }
}

async function upsertPayments(batchId: string, userId: string) {
  const staged = await db.stagedPayment.findMany({ where: { importBatchId: batchId } });
  const groupKey = (s: { leaseExternalId: string; paymentDate: string }) =>
    `${s.leaseExternalId}|${s.paymentDate}`;
  const groupIds = new Map<string, string>();
  for (const s of staged) {
    const issues = JSON.parse(s.issues) as Record<string, unknown>;
    if (issues.splitPayment) {
      const k = groupKey(s);
      if (!groupIds.has(k)) groupIds.set(k, `split_${Math.random().toString(36).slice(2, 10)}`);
    }
  }

  for (let i = 0; i < staged.length; i += CHUNK) {
    const slice = staged.slice(i, i + CHUNK);
    await db.$transaction(async (tx) => {
      for (const s of slice) {
        const issues = JSON.parse(s.issues) as Record<string, unknown>;
        const importStatus = deriveStatus(issues);

        const lease = await tx.lease.findUnique({
          where: {
            sourceSystem_externalId_userId: {
              sourceSystem: "buildium",
              externalId: s.leaseExternalId,
              userId,
            },
          },
        });

        if (!s.parsedDate || s.parsedAmount === null) continue;

        const splitGroupId = issues.splitPayment ? groupIds.get(groupKey(s)) ?? null : null;

        const payment = await tx.payment.upsert({
          where: {
            sourceSystem_externalId_userId: {
              sourceSystem: "buildium",
              externalId: s.externalId,
              userId,
            },
          },
          create: {
            userId,
            leaseId: lease?.id ?? null,
            paymentDate: s.parsedDate,
            amount: s.parsedAmount,
            method: s.method,
            notes: s.notes || null,
            splitPaymentGroupId: splitGroupId,
            importStatus,
            importFlags: s.issues,
            externalId: s.externalId,
            sourceSystem: "buildium",
          },
          update: {
            leaseId: lease?.id ?? null,
            paymentDate: s.parsedDate,
            amount: s.parsedAmount,
            method: s.method,
            notes: s.notes || null,
            splitPaymentGroupId: splitGroupId,
            importStatus,
            importFlags: s.issues,
          },
        });
        await tx.stagedPayment.update({
          where: { id: s.id },
          data: { resolvedPaymentId: payment.id },
        });
      }
    });
  }
}

async function upsertWorkOrders(batchId: string, userId: string) {
  const staged = await db.stagedWorkOrder.findMany({ where: { importBatchId: batchId } });
  for (let i = 0; i < staged.length; i += CHUNK) {
    const slice = staged.slice(i, i + CHUNK);
    await db.$transaction(async (tx) => {
      for (const s of slice) {
        const issues = JSON.parse(s.issues) as Record<string, unknown>;
        const importStatus = deriveStatus(issues);

        const unit = await tx.unit.findUnique({
          where: {
            sourceSystem_externalId_userId: {
              sourceSystem: "buildium",
              externalId: s.unitExternalId,
              userId,
            },
          },
        });

        if (!s.parsedOpened || s.parsedCost === null) continue;

        const wo = await tx.workOrder.upsert({
          where: {
            sourceSystem_externalId_userId: {
              sourceSystem: "buildium",
              externalId: s.externalId,
              userId,
            },
          },
          create: {
            userId,
            unitId: unit?.id ?? null,
            openedDate: s.parsedOpened,
            closedDate: s.parsedClosed ?? null,
            status: s.status,
            category: s.category,
            description: s.description,
            vendorName: s.vendorName,
            cost: s.parsedCost,
            importStatus,
            importFlags: s.issues,
            externalId: s.externalId,
            sourceSystem: "buildium",
          },
          update: {
            unitId: unit?.id ?? null,
            openedDate: s.parsedOpened,
            closedDate: s.parsedClosed ?? null,
            status: s.status,
            category: s.category,
            description: s.description,
            vendorName: s.vendorName,
            cost: s.parsedCost,
            importStatus,
            importFlags: s.issues,
          },
        });
        await tx.stagedWorkOrder.update({
          where: { id: s.id },
          data: { resolvedWorkOrderId: wo.id },
        });
      }
    });
  }
}

function deriveStatus(issues: Record<string, unknown>): string | null {
  if (issues.orphanTenant) return "orphan_tenant";
  if (issues.orphanUnit) return "orphan_unit";
  if (issues.orphanLease) return "orphan_lease";
  if (issues.endBeforeStart) return "end_before_start";
  if (issues.overlap) return "overlap";
  if (issues.malformedEmail) return "malformed_email";
  if (issues.duplicateEmail) return "duplicate_email_merged";
  if (issues.negativeAmount) return "negative_amount";
  if (issues.negativeSqft) return "negative_sqft";
  if (issues.negativeCost) return "negative_cost";
  if (issues.zeroAmount) return "zero_amount";
  if (issues.nullRentTarget) return "null_rent_target";
  if (issues.splitPayment) return "split_payment";
  if (issues.dobParseFail) return "dob_parse_fail";
  if (issues.dateParseFail) return "date_parse_fail";
  return null;
}

function toInt(s: string): number | null {
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function toFloat(s: string): number | null {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
