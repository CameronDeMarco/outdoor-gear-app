import type { PriceOffer, Product } from "./types";

export interface PriceScan {
  /** Lowest total landed cost (price + shipping) among in-stock offers, or null if none. */
  best: (PriceOffer & { totalCents: number }) | null;
  /** Highest total among in-stock offers — used to show potential savings. */
  highest: (PriceOffer & { totalCents: number }) | null;
  /** All offers, sorted cheapest landed cost first; out-of-stock offers sink to the bottom. */
  ranked: Array<PriceOffer & { totalCents: number }>;
  /** Cents saved by buying the best offer vs. the most expensive in-stock offer. */
  savingsVsHighestCents: number;
  /** Cents saved by the best offer vs. MSRP (0 if best >= MSRP). */
  savingsVsMsrpCents: number;
}

function totalCents(offer: PriceOffer): number {
  return offer.priceCents + offer.shippingCents;
}

/**
 * Scan all offers for a product and find the best price.
 *
 * "Best" is the lowest landed cost (item + shipping) among in-stock offers.
 * Out-of-stock offers are still returned in `ranked` but never chosen as best.
 */
export function scanPrices(product: Product): PriceScan {
  const withTotals = product.offers.map((o) => ({ ...o, totalCents: totalCents(o) }));

  const ranked = [...withTotals].sort((a, b) => {
    // In-stock always ranks above out-of-stock.
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
    return a.totalCents - b.totalCents;
  });

  const inStock = withTotals.filter((o) => o.inStock);
  const best = inStock.length
    ? inStock.reduce((lo, o) => (o.totalCents < lo.totalCents ? o : lo))
    : null;
  const highest = inStock.length
    ? inStock.reduce((hi, o) => (o.totalCents > hi.totalCents ? o : hi))
    : null;

  return {
    best,
    highest,
    ranked,
    savingsVsHighestCents: best && highest ? highest.totalCents - best.totalCents : 0,
    savingsVsMsrpCents: best ? Math.max(0, product.msrpCents - best.totalCents) : 0,
  };
}
