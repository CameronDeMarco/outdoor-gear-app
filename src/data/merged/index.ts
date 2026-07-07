import type { DataSource } from "@/data/source";
import type { GearCategory, Product, Retailer } from "@/domain/types";

/**
 * Merges results from multiple DataSources into one unified catalog.
 *
 * Products are matched across sources by normalized name + brand. When the same
 * product appears in more than one source (e.g. Osprey Atmos from both Amazon
 * and Backcountry), their offers and reviews are merged into a single Product
 * so the price-comparison table shows all sellers side-by-side.
 */
export class MergedDataSource implements DataSource {
  constructor(private readonly sources: DataSource[]) {}

  async listRetailers(): Promise<Retailer[]> {
    const all = await Promise.all(this.sources.map((s) => s.listRetailers()));
    const seen = new Set<string>();
    return all.flat().filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  }

  async listProducts(filter?: { category?: GearCategory }): Promise<Product[]> {
    const allResults = await Promise.all(
      this.sources.map((s) => s.listProducts(filter).catch(() => [] as Product[])),
    );
    return mergeProducts(allResults.flat());
  }

  async searchProducts(query: string): Promise<Product[]> {
    const allResults = await Promise.all(
      this.sources.map((s) => s.searchProducts(query).catch(() => [] as Product[])),
    );
    return mergeProducts(allResults.flat());
  }

  async getProduct(id: string): Promise<Product | null> {
    // Try each source in order; first non-null wins.
    // If the same product exists across sources we also merge their offers.
    const results = await Promise.all(
      this.sources.map((s) => s.getProduct(id).catch(() => null)),
    );
    const found = results.filter((p): p is Product => p !== null);
    if (found.length === 0) return null;
    const [first, ...rest] = found;
    return rest.reduce(mergeTwo, first!);
  }
}

/**
 * Merge a flat list of products, combining duplicates by normalized name+brand.
 */
function mergeProducts(products: Product[]): Product[] {
  const map = new Map<string, Product>();
  for (const product of products) {
    const key = normalizeKey(product.name, product.brand);
    const existing = map.get(key);
    map.set(key, existing ? mergeTwo(existing, product) : product);
  }
  return Array.from(map.values());
}

/**
 * Merge two representations of the same product.
 * - Keeps the richer description/specs (whichever is longer).
 * - Combines offers, deduplicating by retailerId.
 * - Combines reviews, deduplicating by source.
 * - Keeps the higher MSRP as the baseline (more conservative savings display).
 */
function mergeTwo(a: Product, b: Product): Product {
  const offersByRetailer = new Map(a.offers.map((o) => [o.retailerId, o]));
  for (const offer of b.offers) {
    if (!offersByRetailer.has(offer.retailerId)) {
      offersByRetailer.set(offer.retailerId, offer);
    }
  }

  const reviewsBySource = new Map(a.reviews.map((r) => [r.source, r]));
  for (const review of b.reviews) {
    if (!reviewsBySource.has(review.source)) {
      reviewsBySource.set(review.source, review);
    }
  }

  return {
    ...a,
    description: a.description.length >= b.description.length ? a.description : b.description,
    msrpCents: Math.max(a.msrpCents, b.msrpCents),
    imageUrl: a.imageUrl ?? b.imageUrl,
    specs: Object.keys(a.specs).length >= Object.keys(b.specs).length ? a.specs : b.specs,
    offers: Array.from(offersByRetailer.values()),
    reviews: Array.from(reviewsBySource.values()),
  };
}

function normalizeKey(name: string, brand: string): string {
  return `${brand}|${name}`
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, " ")
    .trim();
}
