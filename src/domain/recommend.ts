import type { Product } from "./types";
import { scanPrices } from "./prices";

/**
 * Recommendation tuning knobs. Exposed so they can be A/B tested later.
 */
export interface RecommendOptions {
  /**
   * Prior strength for the Bayesian average, expressed in "phantom reviews".
   * Higher = more skepticism toward products with few reviews.
   */
  priorWeight: number;
  /** Assumed mean rating across the whole catalog (the prior). */
  priorMean: number;
  /** How much a good price nudges the score, as a fraction of the rating score. */
  priceWeight: number;
}

export const DEFAULT_OPTIONS: RecommendOptions = {
  priorWeight: 30,
  priorMean: 3.8,
  priceWeight: 0.15,
};

export interface ScoredProduct {
  product: Product;
  /** Final ranking score (higher is better). */
  score: number;
  /** Bayesian-adjusted rating on the 0–5 scale. */
  bayesianRating: number;
  /** Total reviews across all sources. */
  totalReviews: number;
  /** Best landed price in cents, or null if nothing is in stock. */
  bestPriceCents: number | null;
  /** Plain-language reasons this product is recommended. */
  reasons: string[];
}

/**
 * Combine multiple review sources into one volume-weighted average rating
 * and a total review count.
 */
function aggregateReviews(product: Product): { mean: number; count: number } {
  const count = product.reviews.reduce((sum, r) => sum + r.reviewCount, 0);
  if (count === 0) return { mean: 0, count: 0 };
  const weighted = product.reviews.reduce(
    (sum, r) => sum + r.averageRating * r.reviewCount,
    0,
  );
  return { mean: weighted / count, count };
}

/**
 * Bayesian average rating.
 *
 *   adjusted = (priorWeight * priorMean + count * mean) / (priorWeight + count)
 *
 * With few reviews the result sits near priorMean; as reviews accumulate it
 * converges to the product's true mean. This is the same idea behind IMDb's
 * weighted rating and keeps a single 5★ review from topping the charts.
 */
export function bayesianRating(product: Product, opts: RecommendOptions = DEFAULT_OPTIONS): number {
  const { mean, count } = aggregateReviews(product);
  return (opts.priorWeight * opts.priorMean + count * mean) / (opts.priorWeight + count);
}

/**
 * Score a single product. The score blends review quality (the dominant term)
 * with a smaller bonus for how good the best available price is relative to MSRP.
 */
export function scoreProduct(
  product: Product,
  opts: RecommendOptions = DEFAULT_OPTIONS,
): ScoredProduct {
  const rating = bayesianRating(product, opts);
  const { count } = aggregateReviews(product);
  const scan = scanPrices(product);

  // Price bonus: fraction of MSRP saved by the best in-stock offer, in [0, 1].
  const discountFraction =
    scan.best && product.msrpCents > 0
      ? Math.min(1, scan.savingsVsMsrpCents / product.msrpCents)
      : 0;

  // Rating contributes on a 0–5 scale; price adds up to priceWeight*5 on top.
  const score = rating + discountFraction * opts.priceWeight * 5;

  const reasons: string[] = [];
  if (rating >= 4.5) reasons.push("Top-rated across reviews");
  else if (rating >= 4.2) reasons.push("Highly rated");
  if (count >= 1000) reasons.push(`Trusted by ${count.toLocaleString()} reviewers`);
  if (discountFraction >= 0.2)
    reasons.push(`${Math.round(discountFraction * 100)}% below MSRP right now`);
  if (scan.best && !scan.best.inStock) reasons.push("Limited availability");
  if (reasons.length === 0) reasons.push("Solid all-around pick");

  return {
    product,
    score,
    bayesianRating: rating,
    totalReviews: count,
    bestPriceCents: scan.best?.totalCents ?? null,
    reasons,
  };
}

export interface RecommendQuery {
  category?: Product["category"];
  /** Only include products with at least one in-stock offer. */
  inStockOnly?: boolean;
  /** Max number of results. */
  limit?: number;
  options?: Partial<RecommendOptions>;
}

/**
 * Rank a catalog of products into recommendations, best first.
 */
export function recommend(products: Product[], query: RecommendQuery = {}): ScoredProduct[] {
  const opts = { ...DEFAULT_OPTIONS, ...query.options };

  let pool = products;
  if (query.category) pool = pool.filter((p) => p.category === query.category);
  if (query.inStockOnly) pool = pool.filter((p) => p.offers.some((o) => o.inStock));

  const scored = pool.map((p) => scoreProduct(p, opts)).sort((a, b) => b.score - a.score);
  return query.limit ? scored.slice(0, query.limit) : scored;
}
