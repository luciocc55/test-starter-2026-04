import Link from "next/link";
import { all } from "@/lib/listings";
import { applyFilter, type ParsedFilter } from "@/lib/filter";
import { parseQuery } from "@/lib/ai";
import { ListingCard } from "@/components/listing-card";
import { AiBubble } from "@/components/ai-bubble";
import { SearchBox } from "@/components/search-box";

const PASSTHROUGH_FILTER: ParsedFilter = {
  submarket: null,
  sfMin: null,
  sfMax: null,
  features: [],
  subleaseOrDirect: "any",
};

type Parsed =
  | { ok: true; response: string; filter: ParsedFilter }
  | { ok: false; response: string };

async function safeParse(q: string): Promise<Parsed> {
  try {
    const ai = await parseQuery(q);
    return { ok: true, response: ai.response, filter: ai.filter };
  } catch (err) {
    console.error("[search] parseQuery failed", err);
    return {
      ok: false,
      response:
        "AI parsing is temporarily offline, so I couldn't narrow this down — here are all 25 listings. Try again in a moment or browse below.",
    };
  }
}

export async function SearchResults({ q }: { q: string }) {
  const parsed = await safeParse(q);
  const listings = all();
  const filter = parsed.ok ? parsed.filter : PASSTHROUGH_FILTER;
  const result = applyFilter(listings, filter);

  const relaxNote =
    result.relaxed === "size"
      ? "No exact size match — showing the closest fits."
      : result.relaxed === "size+features"
        ? "No exact match on size or features — showing closest submarket fits."
        : result.relaxed === "all"
          ? "Nothing matched your filters — showing everything we have."
          : null;

  return (
    <>
      <AiBubble tone={parsed.ok ? "default" : "warn"}>
        <p>{parsed.response}</p>
        {parsed.ok && <FilterChips filter={parsed.filter} />}
      </AiBubble>

      <div className="mt-6 flex items-baseline justify-between">
        <p className="text-sm text-[color:var(--color-ink-soft)]">
          <span className="font-medium text-[color:var(--color-ink)]">{result.listings.length}</span>{" "}
          {result.listings.length === 1 ? "listing" : "listings"}
          {relaxNote && <span className="ml-2 text-[color:var(--color-accent)]">{relaxNote}</span>}
        </p>
        <Link
          href="/"
          className="text-sm text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)] underline-offset-4 hover:underline"
        >
          Start over
        </Link>
      </div>

      <section className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {result.listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </section>

      <div className="mt-12 max-w-2xl mx-auto">
        <p className="text-sm text-[color:var(--color-ink-soft)] mb-3 text-center">Refine your search</p>
        <SearchBox placeholder="Add detail — e.g. must have outdoor space" label="Refine" />
      </div>
    </>
  );
}

function FilterChips({ filter }: { filter: ParsedFilter }) {
  const chips: string[] = [];
  if (filter.submarket) chips.push(filter.submarket);
  if (filter.sfMin != null || filter.sfMax != null) {
    const lo = filter.sfMin?.toLocaleString() ?? "any";
    const hi = filter.sfMax?.toLocaleString() ?? "any";
    chips.push(`${lo}–${hi} SF`);
  }
  if (filter.subleaseOrDirect !== "any") chips.push(filter.subleaseOrDirect);
  for (const f of filter.features.slice(0, 4)) chips.push(f);
  if (chips.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c}
          className="text-xs px-2 py-0.5 rounded-full bg-[color:var(--color-muted)] text-[color:var(--color-ink-soft)]"
        >
          {c}
        </span>
      ))}
    </div>
  );
}
