import Link from "next/link";
import type { Listing } from "@/lib/listings";
import { formatSf, formatPricePerSf, formatMonthly } from "@/lib/format";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group block bg-[color:var(--color-surface)] border border-[color:var(--color-line)] rounded-2xl overflow-hidden hover:shadow-[0_20px_48px_-24px_rgba(26,24,21,0.25)] transition-all"
    >
      <div className="aspect-[4/3] overflow-hidden bg-[color:var(--color-muted)]">
        <img
          src={listing.heroImage}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
        />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs text-[color:var(--color-ink-soft)] uppercase tracking-wider">
          <span>{listing.submarket}</span>
          <span className="h-1 w-1 rounded-full bg-[color:var(--color-ink-soft)]" />
          <span>{listing.type === "sublease" ? "Sublease" : "Direct"}</span>
          <span className="h-1 w-1 rounded-full bg-[color:var(--color-ink-soft)]" />
          <span>Class {listing.buildingClass}</span>
        </div>
        <h3 className="mt-2 font-display text-xl leading-tight">
          {listing.address} <span className="text-[color:var(--color-ink-soft)]">· {listing.unit}</span>
        </h3>
        <div className="mt-3 flex items-baseline gap-3 text-sm">
          <span className="font-medium text-[color:var(--color-ink)]">{formatSf(listing.sf)}</span>
          <span className="text-[color:var(--color-ink-soft)]">{formatPricePerSf(listing.pricePerSf)}</span>
          <span className="ml-auto text-[color:var(--color-ink)]">{formatMonthly(listing.sf, listing.pricePerSf)}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {listing.features.slice(0, 3).map((f) => (
            <span
              key={f}
              className="text-xs px-2 py-0.5 rounded-full bg-[color:var(--color-muted)] text-[color:var(--color-ink-soft)]"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
