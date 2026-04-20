import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { createHash } from "node:crypto";

const filterSchema = z.object({
  field: z.string(),
  op: z.enum(["eq", "ne", "gt", "gte", "lt", "lte", "contains", "in"]),
  value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]),
});

const aggregateSchema = z.object({
  groupBy: z.string(),
  metric: z.enum(["sum", "count", "avg"]),
  metricField: z.string().nullable(),
  having: z.object({
    op: z.enum(["gt", "gte", "lt", "lte", "eq"]),
    value: z.number(),
  }).nullable(),
});

const intentSchema = z.object({
  response: z.string().max(280),
  refused: z.boolean(),
  intent: z
    .object({
      entity: z.enum(["tenants", "leases", "charges", "payments", "workOrders"]),
      mode: z.enum(["list", "aggregate"]),
      filters: z.array(filterSchema).max(6),
      sort: z.object({ field: z.string(), dir: z.enum(["asc", "desc"]) }).nullable(),
      limit: z.number().int().min(1).max(100),
      aggregate: aggregateSchema.nullable(),
    })
    .nullable(),
});

export type Intent = z.infer<typeof intentSchema>;

const FIELD_WHITELIST: Record<string, readonly string[]> = {
  tenants:    ["firstName", "lastName", "email", "phone", "status"],
  leases:     ["startDate", "endDate", "monthlyRent", "securityDeposit", "status", "tenantId", "unitId"],
  charges:    ["chargeDate", "amount", "type", "description", "leaseId"],
  payments:   ["paymentDate", "amount", "method", "leaseId"],
  workOrders: ["openedDate", "closedDate", "status", "category", "vendorName", "cost", "unitId"],
};
const GROUP_BY_WHITELIST: Record<string, readonly string[]> = {
  tenants:    ["status", "lastName"],
  leases:     ["status", "tenantId", "unitId"],
  charges:    ["leaseId", "type"],
  payments:   ["leaseId", "method"],
  workOrders: ["vendorName", "category", "status"],
};

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

type Entity = keyof typeof FIELD_WHITELIST;

export interface NlQueryResult {
  response: string;
  refused: boolean;
  entity: Entity | null;
  mode: "list" | "aggregate" | null;
  rows: Array<Record<string, unknown>>;
}

export async function runNlQuery(q: string, userId: string): Promise<NlQueryResult> {
  const trimmed = q.trim();
  if (!trimmed) {
    return fallback("Ask me a question about tenants, leases, charges, payments, or work orders.");
  }

  let parsed: Intent;
  try {
    parsed = await parseIntent(trimmed);
  } catch {
    return fallback("I couldn't parse that — try rephrasing.");
  }

  if (parsed.refused || !parsed.intent) {
    return { response: parsed.response, refused: true, entity: null, mode: null, rows: [] };
  }

  const intent = parsed.intent;
  const entity = intent.entity;

  const filters = intent.filters.filter((f) => FIELD_WHITELIST[entity].includes(f.field));
  const sortValid = intent.sort && (
    FIELD_WHITELIST[entity].includes(intent.sort.field) || intent.sort.field === "sum" || intent.sort.field === "count" || intent.sort.field === "avg"
  ) ? intent.sort : null;

  if (intent.mode === "aggregate") {
    const agg = intent.aggregate;
    if (!agg || !GROUP_BY_WHITELIST[entity].includes(agg.groupBy)) {
      return fallback("I couldn't translate that into a valid query — try rephrasing.");
    }
    if (agg.metric !== "count" && (!agg.metricField || !FIELD_WHITELIST[entity].includes(agg.metricField))) {
      return fallback("I couldn't translate that into a valid query — try rephrasing.");
    }
    return runAggregate(entity, filters, agg, sortValid, intent.limit, userId);
  }

  return runList(entity, filters, sortValid, intent.limit, userId);
}

async function parseIntent(q: string): Promise<Intent> {
  "use cache";
  cacheLife("hours");
  cacheTag(`nlq:${createHash("sha1").update(q).digest("hex")}`);

  const modelId = process.env.AI_MODEL ?? DEFAULT_MODEL;
  const prompt = buildPrompt(q);

  const { object } = await generateObject({
    model: gateway(modelId),
    schema: intentSchema,
    prompt,
  });

  return object;
}

function buildPrompt(q: string): string {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yearStart = `${today.getFullYear()}-01-01`;
  const lastYearStart = `${today.getFullYear() - 1}-01-01`;
  const lastYearEnd = `${today.getFullYear() - 1}-12-31`;
  const addDays = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const todayMinus30 = addDays(-30);
  const todayMinus60 = addDays(-60);
  const todayMinus90 = addDays(-90);
  const todayPlus60 = addDays(60);

  const quarter = Math.floor(today.getMonth() / 3);
  const lastQuarterStartMonth = quarter === 0 ? 9 : (quarter - 1) * 3;
  const lastQuarterYear = quarter === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const lastQuarterStart = new Date(lastQuarterYear, lastQuarterStartMonth, 1).toISOString().slice(0, 10);
  const lastQuarterEnd = new Date(lastQuarterYear, lastQuarterStartMonth + 3, 0).toISOString().slice(0, 10);

  return `You are a property management data analyst. Answer questions about a PM portfolio by emitting a structured Intent JSON. Never write SQL.

TODAY: ${todayStr}

ENTITIES:
  tenants     — renters. Fields: firstName, lastName, email, phone, status. status∈{active,past,prospect}.
  leases      — contracts. Fields: startDate, endDate, monthlyRent, securityDeposit, status, tenantId, unitId. status∈{active,ended,renewed,terminated_early}.
  charges     — money owed BY tenants. Fields: chargeDate, amount, type, description, leaseId. type∈{rent,late_fee,utility,repair_chargeback,pet_fee}.
  payments    — money paid BY tenants. Fields: paymentDate, amount, method, leaseId. method∈{check,ach,credit_card,cash}.
  workOrders  — maintenance + vendor spend. Fields: openedDate, closedDate, status, category, vendorName, cost, unitId. status∈{open,in_progress,completed,cancelled}.

DERIVED CONCEPTS:
  outstanding balance — sum(charges)−sum(payments) per lease/tenant.
    "past due", "arrears", "owes", "owed", "delinquent" → entity='charges', mode='aggregate', groupBy='leaseId', metric='sum', metricField='amount'.
    "over \$X past due" → aggregate.having={op:'gt',value:X}.
    The server subtracts payments after the query.
  vendor spend — sum(workOrders.cost) grouped by vendorName.

SYNONYMS:
  renter/resident/occupant → tenants
  contractor/sub/subcontractor → vendorName (workOrders)
  rent/late fee/utility/pet fee → charges.type
  past due/arrears/owes/owed/delinquent → outstanding balance
  paid/payment/receipt → payments
  maintenance/work order/repair → workOrders

TIME PHRASES (resolve against TODAY):
  "this year"→gte ${yearStart} AND lte ${todayStr}
  "last year"→gte ${lastYearStart} AND lte ${lastYearEnd}
  "last 30 days"→gte ${todayMinus30}
  "last 60 days"→gte ${todayMinus60}
  "last 90 days"→gte ${todayMinus90}
  "YTD"→gte ${yearStart}
  "next 60 days"→gte ${todayStr} AND lte ${todayPlus60}
  "last quarter"→gte ${lastQuarterStart} AND lte ${lastQuarterEnd}

REFUSAL:
  Mutation-shaped questions (delete/update/modify/drop/insert): return refused=true, intent=null, response="I can only answer questions — I can't change data."

RESPONSE TONE:
  Lead with the number. Factual. No emoji. Max 2 sentences. The "response" field is a placeholder — the server renders the final response from the actual query result.

EXAMPLES:
  Q: "show me all tenants with past-due rent over \$5,000"
  A: {"response":"<filled server-side>","refused":false,"intent":{"entity":"charges","mode":"aggregate","filters":[{"field":"type","op":"eq","value":"rent"}],"aggregate":{"groupBy":"leaseId","metric":"sum","metricField":"amount","having":{"op":"gt","value":5000}},"sort":{"field":"sum","dir":"desc"},"limit":50}}

  Q: "vendors we paid more than \$10,000 this year"
  A: {"response":"<filled>","refused":false,"intent":{"entity":"workOrders","mode":"aggregate","filters":[{"field":"openedDate","op":"gte","value":"${yearStart}"}],"aggregate":{"groupBy":"vendorName","metric":"sum","metricField":"cost","having":{"op":"gt","value":10000}},"sort":{"field":"sum","dir":"desc"},"limit":50}}

  Q: "active leases expiring in the next 60 days"
  A: {"response":"<filled>","refused":false,"intent":{"entity":"leases","mode":"list","filters":[{"field":"status","op":"eq","value":"active"},{"field":"endDate","op":"gte","value":"${todayStr}"},{"field":"endDate","op":"lte","value":"${todayPlus60}"}],"sort":{"field":"endDate","dir":"asc"},"limit":100,"aggregate":null}}

  Q: "work orders still open from last quarter"
  A: {"response":"<filled>","refused":false,"intent":{"entity":"workOrders","mode":"list","filters":[{"field":"status","op":"in","value":["open","in_progress"]},{"field":"openedDate","op":"gte","value":"${lastQuarterStart}"},{"field":"openedDate","op":"lte","value":"${lastQuarterEnd}"}],"sort":{"field":"openedDate","dir":"asc"},"limit":100,"aggregate":null}}

  Q: "drop all payments"
  A: {"response":"I can only answer questions — I can't change data.","refused":true,"intent":null}

  Q: "what's the total rent roll?"
  A: {"response":"<filled>","refused":false,"intent":{"entity":"leases","mode":"aggregate","filters":[{"field":"status","op":"eq","value":"active"}],"aggregate":{"groupBy":"status","metric":"sum","metricField":"monthlyRent","having":null},"sort":null,"limit":1}}

USER QUESTION: """${q}"""`;
}

interface Filter {
  field: string;
  op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: string | number | Array<string | number>;
}

function buildWhere(entity: Entity, filters: Filter[], userId: string): Record<string, unknown> {
  const where: Record<string, unknown> = { userId };
  for (const f of filters) {
    const coerced = coerceForField(entity, f.field, f.value);
    const op = f.op;
    if (op === "eq") where[f.field] = coerced;
    else if (op === "ne") where[f.field] = { not: coerced };
    else if (op === "gt") where[f.field] = { gt: coerced };
    else if (op === "gte") where[f.field] = { gte: coerced };
    else if (op === "lt") where[f.field] = { lt: coerced };
    else if (op === "lte") where[f.field] = { lte: coerced };
    else if (op === "contains") where[f.field] = { contains: String(coerced) };
    else if (op === "in") where[f.field] = { in: Array.isArray(coerced) ? coerced : [coerced] };
  }
  return where;
}

const DATE_FIELDS = new Set([
  "startDate", "endDate", "chargeDate", "paymentDate", "openedDate", "closedDate",
]);

function coerceForField(_entity: Entity, field: string, value: unknown): unknown {
  if (DATE_FIELDS.has(field)) {
    if (typeof value === "string") {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === "string" ? new Date(v) : v));
    }
  }
  return value;
}

async function runList(
  entity: Entity,
  filters: Filter[],
  sort: { field: string; dir: "asc" | "desc" } | null,
  limit: number,
  userId: string,
): Promise<NlQueryResult> {
  const where = buildWhere(entity, filters, userId);
  const orderBy = sort && FIELD_WHITELIST[entity].includes(sort.field)
    ? { [sort.field]: sort.dir }
    : undefined;

  const rows = await dispatchFindMany(entity, where, orderBy, limit);
  const response = renderListResponse(entity, rows.length);
  return { response, refused: false, entity, mode: "list", rows };
}

async function dispatchFindMany(
  entity: Entity,
  where: Record<string, unknown>,
  orderBy: Record<string, "asc" | "desc"> | undefined,
  take: number,
): Promise<Array<Record<string, unknown>>> {
  switch (entity) {
    case "tenants":    return db.tenant.findMany({ where, orderBy, take }) as unknown as Array<Record<string, unknown>>;
    case "leases":     return db.lease.findMany({ where, orderBy, take, include: { tenant: true, unit: true } }) as unknown as Array<Record<string, unknown>>;
    case "charges":    return db.charge.findMany({ where, orderBy, take, include: { lease: { include: { tenant: true } } } }) as unknown as Array<Record<string, unknown>>;
    case "payments":   return db.payment.findMany({ where, orderBy, take, include: { lease: { include: { tenant: true } } } }) as unknown as Array<Record<string, unknown>>;
    case "workOrders": return db.workOrder.findMany({ where, orderBy, take, include: { unit: { include: { property: true } } } }) as unknown as Array<Record<string, unknown>>;
    default: return [] as Array<Record<string, unknown>>;
  }
}

async function runAggregate(
  entity: Entity,
  filters: Filter[],
  agg: { groupBy: string; metric: "sum" | "count" | "avg"; metricField: string | null; having: { op: "gt" | "gte" | "lt" | "lte" | "eq"; value: number } | null },
  sort: { field: string; dir: "asc" | "desc" } | null,
  limit: number,
  userId: string,
): Promise<NlQueryResult> {
  const where = buildWhere(entity, filters, userId);

  if (entity === "charges" && agg.groupBy === "leaseId" && agg.metric === "sum" && agg.metricField === "amount") {
    return runOutstanding(where, agg.having, sort, limit, userId);
  }

  const rows = await dispatchGroupBy(entity, where, agg, limit);
  const filtered = agg.having ? rows.filter((r) => compare((r.value as number) ?? 0, agg.having!.op, agg.having!.value)) : rows;
  const sorted = sort && sort.field === (agg.metric) ? filtered.sort((a, c) => sort.dir === "desc" ? (c.value as number) - (a.value as number) : (a.value as number) - (c.value as number)) : filtered;
  const response = renderAggregateResponse(entity, agg, sorted);
  return { response, refused: false, entity, mode: "aggregate", rows: sorted };
}

async function dispatchGroupBy(
  entity: Entity,
  where: Record<string, unknown>,
  agg: { groupBy: string; metric: "sum" | "count" | "avg"; metricField: string | null },
  limit: number,
): Promise<Array<Record<string, unknown>>> {
  const by = [agg.groupBy];
  const metricField = agg.metricField;
  const aggArg = agg.metric === "count"
    ? { _count: { _all: true } }
    : agg.metric === "sum" && metricField
    ? { _sum: { [metricField]: true } }
    : agg.metric === "avg" && metricField
    ? { _avg: { [metricField]: true } }
    : { _count: { _all: true } };

  let raw: Array<Record<string, unknown>> = [];
  switch (entity) {
    case "tenants":
      raw = await (db.tenant.groupBy as unknown as (args: unknown) => Promise<Array<Record<string, unknown>>>)({ by, where, ...aggArg, take: limit });
      break;
    case "leases":
      raw = await (db.lease.groupBy as unknown as (args: unknown) => Promise<Array<Record<string, unknown>>>)({ by, where, ...aggArg, take: limit });
      break;
    case "charges":
      raw = await (db.charge.groupBy as unknown as (args: unknown) => Promise<Array<Record<string, unknown>>>)({ by, where, ...aggArg, take: limit });
      break;
    case "payments":
      raw = await (db.payment.groupBy as unknown as (args: unknown) => Promise<Array<Record<string, unknown>>>)({ by, where, ...aggArg, take: limit });
      break;
    case "workOrders":
      raw = await (db.workOrder.groupBy as unknown as (args: unknown) => Promise<Array<Record<string, unknown>>>)({ by, where, ...aggArg, take: limit });
      break;
  }

  return raw.map((r) => ({
    key: r[agg.groupBy],
    value: extractMetric(r, agg),
  }));
}

function extractMetric(row: Record<string, unknown>, agg: { metric: "sum" | "count" | "avg"; metricField: string | null }): number {
  if (agg.metric === "count") {
    const c = (row._count as Record<string, unknown> | undefined)?._all ?? row._count;
    return Number(c ?? 0);
  }
  if (agg.metric === "sum" && agg.metricField) {
    const s = (row._sum as Record<string, unknown> | undefined)?.[agg.metricField];
    return Number(s ?? 0);
  }
  if (agg.metric === "avg" && agg.metricField) {
    const s = (row._avg as Record<string, unknown> | undefined)?.[agg.metricField];
    return Number(s ?? 0);
  }
  return 0;
}

async function runOutstanding(
  where: Record<string, unknown>,
  having: { op: "gt" | "gte" | "lt" | "lte" | "eq"; value: number } | null,
  sort: { field: string; dir: "asc" | "desc" } | null,
  limit: number,
  userId: string,
): Promise<NlQueryResult> {
  const chargeWhere = where;
  const [charges, payments] = await Promise.all([
    db.charge.groupBy({ by: ["leaseId"], where: chargeWhere, _sum: { amount: true } }),
    db.payment.groupBy({ by: ["leaseId"], where: { userId }, _sum: { amount: true } }),
  ]);
  const paidByLease = new Map<string, number>();
  for (const p of payments) if (p.leaseId) paidByLease.set(p.leaseId, Number(p._sum.amount ?? 0));

  const leaseIds = charges.map((c) => c.leaseId).filter((id): id is string => !!id);
  const leases = await db.lease.findMany({
    where: { id: { in: leaseIds } },
    include: { tenant: true },
  });
  const leaseInfo = new Map(leases.map((l) => [l.id, l]));

  const perTenant = new Map<string, { tenantId: string; tenantName: string; outstanding: number }>();
  for (const c of charges) {
    if (!c.leaseId) continue;
    const lease = leaseInfo.get(c.leaseId);
    if (!lease?.tenantId) continue;
    const charged = Number(c._sum.amount ?? 0);
    const paid = paidByLease.get(c.leaseId) ?? 0;
    const net = charged - paid;
    if (net <= 0) continue;
    const name = lease.tenant ? `${lease.tenant.lastName}, ${lease.tenant.firstName}` : "—";
    const existing = perTenant.get(lease.tenantId);
    if (existing) {
      existing.outstanding += net;
    } else {
      perTenant.set(lease.tenantId, { tenantId: lease.tenantId, tenantName: name, outstanding: net });
    }
  }

  let rows = Array.from(perTenant.values()).map((t) => ({
    key: t.tenantId,
    tenantName: t.tenantName,
    value: Math.round(t.outstanding * 100) / 100,
  }));
  if (having) rows = rows.filter((r) => compare(r.value, having.op, having.value));
  rows.sort((a, b) => (sort?.dir === "asc" ? a.value - b.value : b.value - a.value));
  rows = rows.slice(0, limit);

  const total = rows.reduce((s, r) => s + r.value, 0);
  const response = rows.length === 0
    ? "No tenants match that criteria."
    : `${rows.length} tenant${rows.length === 1 ? "" : "s"} match, totaling $${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`;

  return { response, refused: false, entity: "charges", mode: "aggregate", rows };
}

function compare(n: number, op: "gt" | "gte" | "lt" | "lte" | "eq", value: number): boolean {
  if (op === "gt") return n > value;
  if (op === "gte") return n >= value;
  if (op === "lt") return n < value;
  if (op === "lte") return n <= value;
  return n === value;
}

function renderListResponse(entity: Entity, count: number): string {
  if (count === 0) return `No ${entity} match that.`;
  return `${count} ${entity} match.`;
}

function renderAggregateResponse(
  entity: Entity,
  agg: { metric: "sum" | "count" | "avg"; metricField: string | null },
  rows: Array<Record<string, unknown>>,
): string {
  if (rows.length === 0) return `No ${entity} match that.`;
  if (agg.metric === "sum") {
    const total = rows.reduce((s, r) => s + Number(r.value ?? 0), 0);
    return `${rows.length} group${rows.length === 1 ? "" : "s"}, total $${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`;
  }
  return `${rows.length} result${rows.length === 1 ? "" : "s"}.`;
}

function fallback(msg: string): NlQueryResult {
  return { response: msg, refused: false, entity: null, mode: null, rows: [] };
}
