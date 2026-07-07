import type { GearCategory, Product, Retailer } from "@/domain/types";

/**
 * The single seam between the app and the outside world.
 *
 * Everything else (engines, API routes, UI) depends only on this interface,
 * never on a concrete source. To go live with real data you implement this
 * against Amazon PA-API, Best Buy, a price-comparison feed, your own scraper,
 * etc. — and change nothing else. See data/index.ts for source selection.
 */
export interface DataSource {
  /** All retailers we know how to link to / price-check. */
  listRetailers(): Promise<Retailer[]>;

  /** Full catalog, optionally filtered by category. */
  listProducts(filter?: { category?: GearCategory }): Promise<Product[]>;

  /**
   * Free-text product search. Unlike listProducts (fixed categories), this lets
   * users find anything — "running shoes", "trekking poles" — by querying the
   * backend directly. Category is inferred per result on a best-effort basis.
   */
  searchProducts(query: string): Promise<Product[]>;

  /** A single product by id, or null if unknown. */
  getProduct(id: string): Promise<Product | null>;
}
