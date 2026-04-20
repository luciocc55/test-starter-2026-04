import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { all, bySlug } from "@/lib/listings";
import { formatMonthly, formatPricePerSf, formatSf } from "@/lib/format";
import { HeroGallery } from "./hero-gallery";
import { ContactBroker } from "./contact-broker";

export function generateStaticParams() {
  return all().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = bySlug(slug);
  if (!listing) return { title: "Listing not found" };
  const title = `${listing.address} ${listing.unit} — ${listing.submarket}`;
  return {
    title,
    description: listing.description,
    alternates: { canonical: `/listings/${listing.slug}` },
    openGraph: {
      title,
      description: listing.description,
      images: [listing.heroImage],
    },
  };
}

const TRANSIT: Record<string, string[]> = {
  "Hudson Yards": ["7 at 34 St-Hudson Yards (0.1 mi)", "A/C/E at 34 St-Penn (0.5 mi)"],
  "Flatiron": ["N/R/W at 23 St (0.1 mi)", "F/M at 23 St (0.2 mi)", "6 at 23 St (0.2 mi)"],
  "FiDi": ["4/5 at Wall St (0.2 mi)", "2/3 at Wall St (0.2 mi)", "J/Z at Broad St (0.2 mi)"],
  "Midtown East": ["6 at 51 St (0.1 mi)", "E/M at Lex-53 St (0.2 mi)"],
  "Midtown West": ["B/D/F/M at 47-50 Rock (0.1 mi)", "N/Q/R/W at 49 St (0.2 mi)"],
  "SoHo": ["N/R/W at Prince St (0.1 mi)", "6 at Spring St (0.2 mi)"],
  "Tribeca": ["1 at Franklin St (0.1 mi)", "A/C/E at Canal St (0.3 mi)"],
  "Penn Station": ["A/C/E at 34 St-Penn (0.1 mi)", "1/2/3 at 34 St-Penn (0.1 mi)", "NJT / LIRR (0.1 mi)"],
  "Grand Central": ["4/5/6/7 at Grand Central-42 St (0.1 mi)", "S at Grand Central (0.1 mi)", "Metro-North (0.1 mi)"],
  "Chelsea": ["1 at 23 St (0.1 mi)", "C/E at 23 St (0.2 mi)"],
};

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = bySlug(slug);
  if (!listing) notFound();

  const media = [listing.heroImage, ...listing.photos, listing.floorplan];
  const transit = TRANSIT[listing.submarket] ?? ["Subway access within 0.3 mi"];

  return (
    <main className="min-h-screen">
      <header className="px-6 sm:px-8 py-5 border-b border-[color:var(--color-line)] flex items-center justify-between">
        <Link href="/" className="font-display text-xl tracking-tight">BTS</Link>
        <Link
          href="/"
          className="text-sm text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]"
        >
          ← New search
        </Link>
      </header>

      <div className="mx-auto max-w-5xl px-6 sm:px-8 py-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-soft)]">
          <span>{listing.submarket}</span>
          <span className="h-1 w-1 rounded-full bg-[color:var(--color-ink-soft)]" />
          <span>{listing.type === "sublease" ? "Sublease" : "Direct"}</span>
          <span className="h-1 w-1 rounded-full bg-[color:var(--color-ink-soft)]" />
          <span>Class {listing.buildingClass}</span>
        </div>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl leading-tight text-balance">
          {listing.address}{" "}
          <span className="text-[color:var(--color-ink-soft)]">· {listing.unit}</span>
        </h1>

        <div className="mt-6 rounded-2xl overflow-hidden border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
          <HeroGallery images={media} />
        </div>
        <p className="mt-2 text-xs text-[color:var(--color-ink-soft)]">
          Drag or use ← → arrow keys to scrub.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-10">
            <section>
              <h2 className="font-display text-2xl mb-3">About this space</h2>
              <p className="text-[color:var(--color-ink)] leading-relaxed">{listing.description}</p>
            </section>

            <section>
              <h2 className="font-display text-2xl mb-4">Space &amp; building details</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Size" value={formatSf(listing.sf)} />
                <Detail label="Condition" value={listing.condition} />
                <Detail label="Availability" value={listing.availability} />
                <Detail label="Building class" value={listing.buildingClass} />
                <Detail label="Year built" value={String(listing.yearBuilt)} />
                <Detail label="Type" value={listing.type === "sublease" ? "Sublease" : "Direct lease"} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {listing.features.map((f) => (
                  <span
                    key={f}
                    className="text-xs px-2.5 py-1 rounded-full bg-[color:var(--color-muted)] text-[color:var(--color-ink-soft)]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl mb-4">Floor plan &amp; space layout</h2>
              <div className="rounded-2xl overflow-hidden border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
                <img
                  src={listing.floorplan}
                  alt={`Floor plan for ${listing.address} ${listing.unit}`}
                  className="w-full h-auto"
                />
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl mb-4">Transit &amp; commute</h2>
              <ul className="space-y-2 text-sm">
                {transit.map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)] text-xs flex items-center justify-center font-medium">
                      →
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-soft)]">Asking</p>
              <p className="mt-1 font-display text-3xl leading-none">
                {formatPricePerSf(listing.pricePerSf)}
                <span className="text-base text-[color:var(--color-ink-soft)]"> · {formatSf(listing.sf)}</span>
              </p>
              <p className="mt-3 text-sm text-[color:var(--color-ink-soft)]">
                ≈ {formatMonthly(listing.sf, listing.pricePerSf)} monthly
              </p>
              <div className="my-5 h-px bg-[color:var(--color-line)]" />
              <ContactBroker address={listing.address} />
              <p className="mt-3 text-xs text-[color:var(--color-ink-soft)] text-center">
                No obligation. One broker, one reply.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]">{label}</dt>
      <dd className="mt-1 text-[color:var(--color-ink)]">{value}</dd>
    </div>
  );
}
