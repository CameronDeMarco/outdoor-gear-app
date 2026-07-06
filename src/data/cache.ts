import type { DataSource } from "./source";
import type { GearCategory, Product, Retailer } from "@/domain/types";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

/**
 * Wraps any DataSource with an in-memory TTL cache.
 *
 * TTLs are intentionally conservative so prices stay reasonably fresh:
 *   - Products / prices: 1 hour
 *   - Retailers: 24 hours (never changes in practice)
 *
 * Combined with Next.js fetch-level caching (set via `next: { revalidate }`
 * in each adapter), this gives two layers: the fetch cache survives across
 * cold starts on Vercel; the in-memory cache eliminates redundant fetches
 * within the same server process lifetime.
 */
export class CachingDataSource implements DataSource {
  private cache = new TtlCache();
  private readonly productTtl: number;
  private readonly retailerTtl: number;

  constructor(
    private readonly inner: DataSource,
    { productTtlMs = 60 * 60 * 1000, retailerTtlMs = 24 * 60 * 60 * 1000 } = {},
  ) {
    this.productTtl = productTtlMs;
    this.retailerTtl = retailerTtlMs;
  }

  async listRetailers(): Promise<Retailer[]> {
    const key = "retailers";
    const cached = this.cache.get<Retailer[]>(key);
    if (cached) return cached;
    const result = await this.inner.listRetailers();
    this.cache.set(key, result, this.retailerTtl);
    return result;
  }

  async listProducts(filter?: { category?: GearCategory }): Promise<Product[]> {
    const key = `products:${filter?.category ?? "all"}`;
    const cached = this.cache.get<Product[]>(key);
    if (cached) return cached;
    const result = await this.inner.listProducts(filter);
    this.cache.set(key, result, this.productTtl);
    // Note: we intentionally do NOT pre-populate the per-product cache here.
    // Detail pages enrich each product with per-seller offers (immersive API),
    // which the list-level product lacks. The first detail view fetches and
    // caches that richer version under `product:{id}`.
    return result;
  }

  async getProduct(id: string): Promise<Product | null> {
    const key = `product:${id}`;
    const cached = this.cache.get<Product | null>(key);
    if (cached !== undefined) return cached;
    const result = await this.inner.getProduct(id);
    this.cache.set(key, result, this.productTtl);
    return result;
  }
}
