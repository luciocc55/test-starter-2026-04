import { db } from "@/lib/db";

export interface ExpensesByMonth {
  month: string;
  categories: Record<string, number>;
  total: number;
}

export async function getMonthlyExpenses(userId: string): Promise<ExpensesByMonth[]> {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);

  const rows = await db.workOrder.findMany({
    where: {
      userId,
      openedDate: { gte: start },
      cost: { gte: 0 },
      importStatus: null,
    },
    select: { openedDate: true, category: true, cost: true },
    orderBy: { openedDate: "asc" },
  });

  const months: ExpensesByMonth[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ month: monthKey(d), categories: {}, total: 0 });
  }
  const byKey = new Map(months.map((m) => [m.month, m]));

  for (const row of rows) {
    const key = monthKey(row.openedDate);
    const m = byKey.get(key);
    if (!m) continue;
    const cat = row.category || "other";
    const amt = Number(row.cost);
    m.categories[cat] = (m.categories[cat] ?? 0) + amt;
    m.total += amt;
  }

  return months;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
