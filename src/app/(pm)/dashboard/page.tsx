import { Suspense } from "react";
import { NlQueryBar } from "./_nl-query";
import { RentRoll } from "./_rent-roll";
import { ArAging } from "./_ar-aging";
import { ExpenseChart } from "./_expense-chart";

export default function DashboardPage() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <header>
        <h1 className="font-display text-4xl tracking-tight text-[color:var(--color-ink)] mb-2">
          Dashboard
        </h1>
        <p className="text-sm text-[color:var(--color-ink-soft)]">
          Ask about your portfolio, check rent roll, aging, and monthly spend.
        </p>
      </header>

      <NlQueryBar />

      <Suspense fallback={<CardSkeleton label="Rent roll" />}>
        <RentRoll />
      </Suspense>

      <Suspense fallback={<CardSkeleton label="AR aging" />}>
        <ArAging />
      </Suspense>

      <Suspense fallback={<CardSkeleton label="Expenses" />}>
        <ExpenseChart />
      </Suspense>
    </section>
  );
}

function CardSkeleton({ label }: { label: string }) {
  return (
    <div className="border border-[color:var(--color-line)] rounded-lg bg-[color:var(--color-surface)] p-8 text-sm text-[color:var(--color-ink-soft)]">
      Loading {label}…
    </div>
  );
}
