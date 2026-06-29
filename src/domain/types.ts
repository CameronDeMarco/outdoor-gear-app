/**
 * Core domain model for the outdoor gear app.
 *
 * Money is always stored as an integer number of cents to avoid
 * floating-point rounding errors. Use the helpers in lib/format.ts to display it.
 */

export type GearCategory =
  | "tents"
  | "sleeping-bags"
  | "backpacks"
  | "hiking-boots"
  | "jackets"
  | "stoves"
  | "water-filters"
  | "headlamps";

export interface Retailer {
  id: string;
  name: string;
  /** Base site URL, e.g. "https://www.rei.com" */
  url: string;
}

/**
 * A single price offer for a product from one retailer.
 * One product can have many offers; the price scanner picks the best.
 */
export interface PriceOffer {
  retailerId: string;
  /** Item price in cents. */
  priceCents: number;
  /** Shipping cost in cents (0 for free shipping). */
  shippingCents: number;
  currency: "USD";
  inStock: boolean;
  /** Deep link to the product page on the retailer's site. */
  url: string;
  /** When this price was last fetched. */
  lastUpdated: string; // ISO 8601
}

/**
 * Aggregated review data from a single source (e.g. REI, Amazon, OutdoorGearLab).
 * We keep sources separate so the recommender can weight them and show provenance.
 */
export interface ReviewSummary {
  source: string;
  /** Average rating on a 0–5 scale. */
  averageRating: number;
  /** Number of reviews this average is based on. */
  reviewCount: number;
  /** Optional link to the reviews. */
  url?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: GearCategory;
  description: string;
  /** Manufacturer's suggested retail price in cents, used as a savings baseline. */
  msrpCents: number;
  imageUrl?: string;
  /** Key specs shown on the detail page, e.g. { Weight: "2.7 lb" }. */
  specs: Record<string, string>;
  reviews: ReviewSummary[];
  offers: PriceOffer[];
}
