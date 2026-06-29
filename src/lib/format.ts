/** Format an integer number of cents as a USD string, e.g. 49995 -> "$499.95". */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

/** "4.62" -> "4.6". One decimal place for ratings. */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}
