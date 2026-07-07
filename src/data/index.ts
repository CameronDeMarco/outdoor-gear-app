import type { DataSource } from "./source";
import type { GearCategory, Product, Retailer } from "@/domain/types";
import { MockDataSource } from "./mock";
import { RainforestDataSource } from "./rainforest";
import { AvantLinkDataSource } from "./avantlink";
import { SerpApiDataSource } from "./serpapi";
import { MergedDataSource } from "./merged";
import { CachingDataSource } from "./cache";

/**
 * Tries the primary source; if it throws (quota exceeded, network error, etc.)
 * logs a warning and returns results from the fallback instead.
 */
class FallbackDataSource implements DataSource {
  constructor(
    private readonly primary: DataSource,
    private readonly fallback: DataSource,
  ) {}

  private async try<T>(fn: (s: DataSource) => Promise<T>): Promise<T> {
    try {
      return await fn(this.primary);
    } catch (err) {
      console.warn("[data] Primary source failed, using fallback:", (err as Error).message);
      return fn(this.fallback);
    }
  }

  listRetailers(): Promise<Retailer[]> {
    return this.try((s) => s.listRetailers());
  }
  listProducts(filter?: { category?: GearCategory }): Promise<Product[]> {
    return this.try((s) => s.listProducts(filter));
  }
  searchProducts(query: string): Promise<Product[]> {
    return this.try((s) => s.searchProducts(query));
  }
  getProduct(id: string): Promise<Product | null> {
    return this.try((s) => s.getProduct(id));
  }
}

/**
 * Builds the active data source from environment variables.
 *
 * DATA_SOURCE controls which backend(s) are used:
 *   "mock"        — seed data only (default, no API keys needed)
 *   "serpapi"     — Google Shopping via SerpAPI (multi-retailer prices in one call)
 *   "rainforest"  — Amazon product data via Rainforest API
 *   "avantlink"   — REI / Backcountry / Sierra via AvantLink feeds
 *   "live"        — SerpAPI + AvantLink merged (full production mode)
 *
 * Set the relevant env vars in .env.local (see .env.example).
 */
function buildDataSource(): DataSource {
  const mode = process.env["DATA_SOURCE"] ?? "mock";

  const hasSerpApi = Boolean(process.env["SERPAPI_KEY"]);
  const hasRainforest = Boolean(process.env["RAINFOREST_API_KEY"]);
  const hasAvantLink =
    Boolean(process.env["AVANTLINK_API_KEY"]) && Boolean(process.env["AVANTLINK_WEBSITE_ID"]);

  if (mode === "live" && hasSerpApi && hasAvantLink) {
    return new CachingDataSource(
      new FallbackDataSource(
        new MergedDataSource([
          new SerpApiDataSource(process.env["SERPAPI_KEY"]!),
          new AvantLinkDataSource({
            apiKey: process.env["AVANTLINK_API_KEY"]!,
            websiteId: process.env["AVANTLINK_WEBSITE_ID"]!,
          }),
        ]),
        new MockDataSource(),
      ),
    );
  }

  if ((mode === "serpapi" || mode === "live") && hasSerpApi) {
    return new CachingDataSource(
      new FallbackDataSource(
        new SerpApiDataSource(process.env["SERPAPI_KEY"]!),
        new MockDataSource(),
      ),
    );
  }

  if ((mode === "rainforest" || mode === "live") && hasRainforest) {
    return new CachingDataSource(
      new FallbackDataSource(
        new RainforestDataSource(process.env["RAINFOREST_API_KEY"]!),
        new MockDataSource(),
      ),
    );
  }

  if ((mode === "avantlink" || mode === "live") && hasAvantLink) {
    return new CachingDataSource(
      new FallbackDataSource(
        new AvantLinkDataSource({
          apiKey: process.env["AVANTLINK_API_KEY"]!,
          websiteId: process.env["AVANTLINK_WEBSITE_ID"]!,
        }),
        new MockDataSource(),
      ),
    );
  }

  if (mode !== "mock") {
    console.warn(
      `[data] DATA_SOURCE="${mode}" but required env vars are missing — falling back to mock data.`,
    );
  }

  return new MockDataSource();
}

let cached: DataSource | null = null;

export function getDataSource(): DataSource {
  cached ??= buildDataSource();
  return cached;
}
