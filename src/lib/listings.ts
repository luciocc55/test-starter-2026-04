import { z } from "zod";
import raw from "../../data/listings.json";

export const listingSchema = z.object({
  id: z.string(),
  slug: z.string(),
  address: z.string(),
  unit: z.string(),
  submarket: z.string(),
  sf: z.number(),
  pricePerSf: z.number(),
  availability: z.string(),
  type: z.enum(["direct", "sublease"]),
  condition: z.string(),
  features: z.array(z.string()),
  description: z.string(),
  heroImage: z.string(),
  photos: z.array(z.string()),
  floorplan: z.string(),
  buildingClass: z.string(),
  yearBuilt: z.number(),
});

export type Listing = z.infer<typeof listingSchema>;

const SUBMARKET_ALIASES: Record<string, string> = {
  "grand central area": "Grand Central",
};

export function canonSubmarket(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return SUBMARKET_ALIASES[key] ?? value.trim();
}

const parsed: Listing[] = z.array(listingSchema).parse(raw).map((l) => ({
  ...l,
  submarket: canonSubmarket(l.submarket)!,
}));

export function all(): Listing[] {
  return parsed;
}

export function bySlug(slug: string): Listing | undefined {
  return parsed.find((l) => l.slug === slug);
}

export function submarkets(): string[] {
  return Array.from(new Set(parsed.map((l) => l.submarket))).sort();
}
