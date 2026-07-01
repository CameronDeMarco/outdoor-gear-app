import type { DataSource } from "./source";
import { MockDataSource } from "./mock";
import { RainforestDataSource } from "./rainforest";
import { AvantLinkDataSource } from "./avantlink";
import { MergedDataSource } from "./merged";

/**
 * Builds the active data source from environment variables.
 *
 * DATA_SOURCE controls which backend(s) are used:
 *   "mock"        — seed data only (default, no API keys needed)
 *   "rainforest"  — Amazon product data via Rainforest API
 *   "avantlink"   — REI / Backcountry / Sierra via AvantLink feeds
 *   "live"        — Rainforest + AvantLink merged (full production mode)
 *
 * Set the relevant env vars in .env.local (see .env.example).
 */
function buildDataSource(): DataSource {
  const mode = process.env["DATA_SOURCE"] ?? "mock";

  const hasRainforest = Boolean(process.env["RAINFOREST_API_KEY"]);
  const hasAvantLink =
    Boolean(process.env["AVANTLINK_API_KEY"]) && Boolean(process.env["AVANTLINK_WEBSITE_ID"]);

  if (mode === "live" && hasRainforest && hasAvantLink) {
    return new MergedDataSource([
      new RainforestDataSource(process.env["RAINFOREST_API_KEY"]!),
      new AvantLinkDataSource({
        apiKey: process.env["AVANTLINK_API_KEY"]!,
        websiteId: process.env["AVANTLINK_WEBSITE_ID"]!,
      }),
    ]);
  }

  if ((mode === "rainforest" || mode === "live") && hasRainforest) {
    return new RainforestDataSource(process.env["RAINFOREST_API_KEY"]!);
  }

  if ((mode === "avantlink" || mode === "live") && hasAvantLink) {
    return new AvantLinkDataSource({
      apiKey: process.env["AVANTLINK_API_KEY"]!,
      websiteId: process.env["AVANTLINK_WEBSITE_ID"]!,
    });
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
