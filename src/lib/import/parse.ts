import AdmZip from "adm-zip";
import { parse as parseCsv } from "csv-parse/sync";
import { db } from "@/lib/db";
import { parseDate, isValidEmail, parseNumber, parseInteger } from "./validate";
import { normalizePropertyName, clusterPropertyNames } from "./normalize";

const CHUNK = 500;

interface RawTenantRow {
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  status: string;
  notes: string;
}
interface RawUnitRow {
  unit_id: string;
  property_name: string;
  unit_number: string;
  bedrooms: string;
  bathrooms: string;
  square_feet: string;
  monthly_rent_target: string;
  status: string;
}
interface RawLeaseRow {
  lease_id: string;
  tenant_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: string;
  security_deposit: string;
  status: string;
}
interface RawChargeRow {
  charge_id: string;
  lease_id: string;
  charge_date: string;
  amount: string;
  type: string;
  description: string;
}
interface RawPaymentRow {
  payment_id: string;
  lease_id: string;
  payment_date: string;
  amount: string;
  method: string;
  notes: string;
}
interface RawWorkOrderRow {
  work_order_id: string;
  unit_id: string;
  opened_date: string;
  closed_date: string;
  status: string;
  category: string;
  description: string;
  vendor_name: string;
  cost: string;
}

function readCsv<T>(zip: AdmZip, filename: string): T[] {
  const entry = zip.getEntry(filename);
  if (!entry) throw new Error(`Missing file in zip: ${filename}`);
  const text = entry.getData().toString("utf8");
  return parseCsv(text, { columns: true, skip_empty_lines: true, trim: true }) as T[];
}

export async function parseImport(batchId: string, zipBytes: Buffer) {
  const zip = new AdmZip(zipBytes);

  const rawTenants = readCsv<RawTenantRow>(zip, "tenants.csv");
  const rawUnits = readCsv<RawUnitRow>(zip, "units.csv");
  const rawLeases = readCsv<RawLeaseRow>(zip, "leases.csv");
  const rawCharges = readCsv<RawChargeRow>(zip, "charges.csv");
  const rawPayments = readCsv<RawPaymentRow>(zip, "payments.csv");
  const rawWorkOrders = readCsv<RawWorkOrderRow>(zip, "work_orders.csv");

  const tenantIdSet = new Set(rawTenants.map((t) => t.tenant_id));
  const unitIdSet = new Set(rawUnits.map((u) => u.unit_id));
  const leaseIdSet = new Set(rawLeases.map((l) => l.lease_id));

  const emailSeen = new Map<string, number>();

  const stagedTenants = rawTenants.map((row, i) => {
    const rowNumber = i + 2;
    const issues: Record<string, boolean | string> = {};
    const email = row.email ?? "";
    const parsedDob = parseDate(row.date_of_birth);

    if (!isValidEmail(email)) issues.malformedEmail = true;
    if (!row.phone) issues.missingPhone = true;
    if (row.date_of_birth && !parsedDob) issues.dobParseFail = row.date_of_birth;

    if (isValidEmail(email)) {
      if (emailSeen.has(email)) {
        issues.duplicateEmail = true;
      } else {
        emailSeen.set(email, rowNumber);
      }
    }

    return {
      importBatchId: batchId,
      rowNumber,
      externalId: row.tenant_id,
      firstName: row.first_name ?? "",
      lastName: row.last_name ?? "",
      email,
      phone: row.phone ?? "",
      dateOfBirth: row.date_of_birth ?? "",
      parsedDob,
      status: row.status ?? "",
      notes: row.notes ?? "",
      issues: JSON.stringify(issues),
    };
  });

  const stagedUnits = rawUnits.map((row, i) => {
    const rowNumber = i + 2;
    const issues: Record<string, boolean | string> = {};
    const sqft = parseInteger(row.square_feet);
    if (sqft !== null && sqft < 0) issues.negativeSqft = true;
    if (row.monthly_rent_target === "" || row.monthly_rent_target == null) {
      issues.nullRentTarget = true;
    }
    return {
      importBatchId: batchId,
      rowNumber,
      externalId: row.unit_id,
      propertyName: row.property_name ?? "",
      normalizedPropertyName: normalizePropertyName(row.property_name ?? ""),
      unitNumber: row.unit_number ?? "",
      bedrooms: row.bedrooms ?? "",
      bathrooms: row.bathrooms ?? "",
      squareFeet: row.square_feet ?? "",
      monthlyRentTarget: row.monthly_rent_target ?? "",
      status: row.status ?? "",
      issues: JSON.stringify(issues),
    };
  });

  const leasesByUnit = new Map<string, { externalId: string; start: Date; end: Date }[]>();

  const stagedLeases = rawLeases.map((row, i) => {
    const rowNumber = i + 2;
    const issues: Record<string, boolean | string> = {};
    const parsedStart = parseDate(row.start_date);
    const parsedEnd = parseDate(row.end_date);

    if (!tenantIdSet.has(row.tenant_id)) issues.orphanTenant = true;
    if (!unitIdSet.has(row.unit_id)) issues.orphanUnit = true;
    if (parsedStart && parsedEnd && parsedEnd < parsedStart) issues.endBeforeStart = true;

    if (parsedStart && parsedEnd && row.unit_id) {
      const arr = leasesByUnit.get(row.unit_id) ?? [];
      for (const existing of arr) {
        const overlap = parsedStart <= existing.end && existing.start <= parsedEnd;
        if (overlap) {
          issues.overlap = true;
          break;
        }
      }
      arr.push({ externalId: row.lease_id, start: parsedStart, end: parsedEnd });
      leasesByUnit.set(row.unit_id, arr);
    }

    return {
      importBatchId: batchId,
      rowNumber,
      externalId: row.lease_id,
      tenantExternalId: row.tenant_id ?? "",
      unitExternalId: row.unit_id ?? "",
      startDate: row.start_date ?? "",
      endDate: row.end_date ?? "",
      parsedStart,
      parsedEnd,
      monthlyRent: row.monthly_rent ?? "",
      securityDeposit: row.security_deposit ?? "",
      status: row.status ?? "",
      issues: JSON.stringify(issues),
    };
  });

  const stagedCharges = rawCharges.map((row, i) => {
    const rowNumber = i + 2;
    const issues: Record<string, boolean | string> = {};
    const parsedDate = parseDate(row.charge_date);
    const parsedAmount = parseNumber(row.amount);

    if (!leaseIdSet.has(row.lease_id)) issues.orphanLease = true;
    if (parsedAmount !== null && parsedAmount < 0) issues.negativeAmount = true;
    if (row.charge_date && !parsedDate) issues.dateParseFail = row.charge_date;
    if (row.amount && parsedAmount === null) issues.amountParseFail = row.amount;

    return {
      importBatchId: batchId,
      rowNumber,
      externalId: row.charge_id,
      leaseExternalId: row.lease_id ?? "",
      chargeDate: row.charge_date ?? "",
      parsedDate,
      amount: row.amount ?? "",
      parsedAmount: parsedAmount === null ? null : parsedAmount.toString(),
      type: row.type ?? "",
      description: row.description ?? "",
      issues: JSON.stringify(issues),
    };
  });

  const payKey = (r: RawPaymentRow) => `${r.lease_id}|${r.payment_date}`;
  const payCount = new Map<string, number>();
  for (const p of rawPayments) payCount.set(payKey(p), (payCount.get(payKey(p)) ?? 0) + 1);

  const stagedPayments = rawPayments.map((row, i) => {
    const rowNumber = i + 2;
    const issues: Record<string, boolean | string> = {};
    const parsedDate = parseDate(row.payment_date);
    const parsedAmount = parseNumber(row.amount);

    if (!leaseIdSet.has(row.lease_id)) issues.orphanLease = true;
    if (parsedAmount === 0) issues.zeroAmount = true;
    if (parsedAmount !== null && parsedAmount < 0) issues.negativeAmount = true;
    if ((payCount.get(payKey(row)) ?? 0) > 1 && row.lease_id) issues.splitPayment = true;
    if (row.payment_date && !parsedDate) issues.dateParseFail = row.payment_date;

    return {
      importBatchId: batchId,
      rowNumber,
      externalId: row.payment_id,
      leaseExternalId: row.lease_id ?? "",
      paymentDate: row.payment_date ?? "",
      parsedDate,
      amount: row.amount ?? "",
      parsedAmount: parsedAmount === null ? null : parsedAmount.toString(),
      method: row.method ?? "",
      notes: row.notes ?? "",
      issues: JSON.stringify(issues),
    };
  });

  const stagedWorkOrders = rawWorkOrders.map((row, i) => {
    const rowNumber = i + 2;
    const issues: Record<string, boolean | string> = {};
    const parsedOpened = parseDate(row.opened_date);
    const parsedClosed = row.closed_date ? parseDate(row.closed_date) : null;
    const parsedCost = parseNumber(row.cost);

    if (!unitIdSet.has(row.unit_id)) issues.orphanUnit = true;
    if (parsedCost !== null && parsedCost < 0) issues.negativeCost = true;

    return {
      importBatchId: batchId,
      rowNumber,
      externalId: row.work_order_id,
      unitExternalId: row.unit_id ?? "",
      openedDate: row.opened_date ?? "",
      closedDate: row.closed_date ?? "",
      parsedOpened,
      parsedClosed,
      status: row.status ?? "",
      category: row.category ?? "",
      description: row.description ?? "",
      vendorName: row.vendor_name ?? "",
      cost: row.cost ?? "",
      parsedCost: parsedCost === null ? null : parsedCost.toString(),
      issues: JSON.stringify(issues),
    };
  });

  await bulkInsert("stagedTenant", stagedTenants);
  await bulkInsert("stagedUnit", stagedUnits);
  await bulkInsert("stagedLease", stagedLeases);
  await bulkInsert("stagedCharge", stagedCharges);
  await bulkInsert("stagedPayment", stagedPayments);
  await bulkInsert("stagedWorkOrder", stagedWorkOrders);

  const fuzzyClusters = clusterPropertyNames(rawUnits.map((u) => u.property_name ?? ""));

  const counts = {
    tenants: {
      total: stagedTenants.length,
      duplicateEmails: stagedTenants.filter((t) => JSON.parse(t.issues).duplicateEmail).length,
      malformedEmails: stagedTenants.filter((t) => JSON.parse(t.issues).malformedEmail).length,
      missingPhone: stagedTenants.filter((t) => JSON.parse(t.issues).missingPhone).length,
      dobParseFail: stagedTenants.filter((t) => JSON.parse(t.issues).dobParseFail).length,
    },
    units: {
      total: stagedUnits.length,
      negativeSqft: stagedUnits.filter((u) => JSON.parse(u.issues).negativeSqft).length,
      nullRent: stagedUnits.filter((u) => JSON.parse(u.issues).nullRentTarget).length,
      fuzzyClusters: fuzzyClusters.length,
    },
    leases: {
      total: stagedLeases.length,
      orphanTenant: stagedLeases.filter((l) => JSON.parse(l.issues).orphanTenant).length,
      orphanUnit: stagedLeases.filter((l) => JSON.parse(l.issues).orphanUnit).length,
      endBeforeStart: stagedLeases.filter((l) => JSON.parse(l.issues).endBeforeStart).length,
      overlap: stagedLeases.filter((l) => JSON.parse(l.issues).overlap).length,
    },
    charges: {
      total: stagedCharges.length,
      orphanLease: stagedCharges.filter((c) => JSON.parse(c.issues).orphanLease).length,
      negativeAmount: stagedCharges.filter((c) => JSON.parse(c.issues).negativeAmount).length,
      dateParseFail: stagedCharges.filter((c) => JSON.parse(c.issues).dateParseFail).length,
    },
    payments: {
      total: stagedPayments.length,
      orphanLease: stagedPayments.filter((p) => JSON.parse(p.issues).orphanLease).length,
      zeroAmount: stagedPayments.filter((p) => JSON.parse(p.issues).zeroAmount).length,
      splitPayment: stagedPayments.filter((p) => JSON.parse(p.issues).splitPayment).length,
    },
    workOrders: {
      total: stagedWorkOrders.length,
      orphanUnit: stagedWorkOrders.filter((w) => JSON.parse(w.issues).orphanUnit).length,
      negativeCost: stagedWorkOrders.filter((w) => JSON.parse(w.issues).negativeCost).length,
    },
  };

  await db.importBatch.update({
    where: { id: batchId },
    data: {
      status: "ready",
      parsedAt: new Date(),
      counts: JSON.stringify(counts),
      fuzzyClusters: JSON.stringify(fuzzyClusters),
    },
  });
}

async function bulkInsert(
  model: "stagedTenant" | "stagedUnit" | "stagedLease" | "stagedCharge" | "stagedPayment" | "stagedWorkOrder",
  rows: object[],
) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    await (db[model] as unknown as { createMany: (args: { data: unknown[] }) => Promise<unknown> }).createMany({ data: slice });
  }
}
