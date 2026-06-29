import type { DataSource } from "./source";
import { MockDataSource } from "./mock";

/**
 * Selects the active data source. Today it always returns the mock source.
 *
 * When you add real adapters, switch on an env var here, e.g.:
 *
 *   switch (process.env.DATA_SOURCE) {
 *     case "amazon": return new AmazonDataSource(process.env.AMAZON_KEY!);
 *     default:       return new MockDataSource();
 *   }
 *
 * Nothing else in the app needs to change.
 */
let cached: DataSource | null = null;

export function getDataSource(): DataSource {
  cached ??= new MockDataSource();
  return cached;
}
