import { requireUser } from "@/lib/auth";
import { getMonthlyExpenses } from "@/lib/dashboard/expenses";
import { ExpenseChartView } from "./_expense-chart-view";

export async function ExpenseChart() {
  const user = await requireUser();
  const months = await getMonthlyExpenses(user.id);
  return (
    <div className="border border-[color:var(--color-line)] rounded-lg bg-[color:var(--color-surface)]">
      <div className="px-6 py-4 border-b border-[color:var(--color-line)]">
        <h2 className="font-display text-xl text-[color:var(--color-ink)]">Expenses — last 12 months</h2>
        <p className="text-xs text-[color:var(--color-ink-soft)] mt-0.5">
          Derived from work-order costs. Utilities, taxes, insurance aren&rsquo;t in the import yet.
        </p>
      </div>
      <ExpenseChartView months={months} />
    </div>
  );
}
