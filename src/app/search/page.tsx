import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SearchResults } from "./search-results";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  if (!query) return { title: "Search" };
  return {
    title: `${query} — office search`,
    description: `AI-powered office search results for "${query}" across NYC submarkets.`,
    alternates: { canonical: `/search?q=${encodeURIComponent(query)}` },
  };
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <main className="min-h-screen">
      <header className="px-6 sm:px-8 py-5 border-b border-[color:var(--color-line)] flex items-center justify-between">
        <Link href="/" className="font-display text-xl tracking-tight">BTS</Link>
        <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-soft)]">
          Describe your space
        </span>
      </header>

      <div className="mx-auto max-w-6xl px-6 sm:px-8 py-10">
        <Suspense fallback={<SearchSkeleton />}>
          <SearchArea searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function SearchArea({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  if (!query) redirect("/");

  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-ink-soft)] mb-2">
        You asked
      </p>
      <h1 className="font-display text-3xl sm:text-4xl leading-tight mb-8 text-balance">
        &ldquo;{query}&rdquo;
      </h1>
      <SearchResults q={query} />
    </>
  );
}

function SearchSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 w-24 rounded bg-[color:var(--color-muted)] mb-2" />
      <div className="h-10 w-2/3 rounded bg-[color:var(--color-muted)] mb-8" />
      <div className="h-24 rounded-2xl bg-[color:var(--color-muted)]" />
      <div className="mt-4 h-5 w-32 rounded bg-[color:var(--color-muted)]" />
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-[color:var(--color-muted)] aspect-[4/3]" />
        ))}
      </div>
    </div>
  );
}
