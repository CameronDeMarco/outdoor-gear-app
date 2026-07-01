import type { DataSource } from "@/data/source";
import type { GearCategory, Product, PriceOffer, Retailer } from "@/domain/types";
import type { AvantLinkProduct } from "./types";

const BASE_URL = "https://classic.avantlink.com/api.php";

/**
 * AvantLink merchant IDs for the retailers we care about.
 * Find yours at: avantlink.com → Merchants → search by name → Merchant ID column.
 *
 * Placeholders below — replace with your actual IDs once you're approved.
 */
const MERCHANT_IDS: Record<string, string> = {
  rei: "REI_MERCHANT_ID",
  backcountry: "BACKCOUNTRY_MERCHANT_ID",
  sierra: "SIERRA_MERCHANT_ID",
};

const RETAILER_META: Record<string, Omit<Retailer, "id">> = {
  rei: { name: "REI", url: "https://www.rei.com" },
  backcountry: { name: "Backcountry", url: "https://www.backcountry.com" },
  sierra: { name: "Sierra", url: "https://www.sierra.com" },
};

/**
 * AvantLink category keyword searches per our GearCategory.
 * The API accepts free-text keyword searches against product names/descriptions.
 */
const CATEGORY_KEYWORDS: Record<GearCategory, string> = {
  tents: "backpacking tent",
  "sleeping-bags": "sleeping bag",
  backpacks: "hiking backpack",
  "hiking-boots": "hiking boots",
  jackets: "outdoor jacket",
  stoves: "camp stove",
  "water-filters": "water filter",
  headlamps: "headlamp",
};

function parsePrice(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function merchantIdToRetailerId(merchantName: string): string {
  const lower = merchantName.toLowerCase();
  if (lower.includes("rei")) return "rei";
  if (lower.includes("backcountry")) return "backcountry";
  if (lower.includes("sierra")) return "sierra";
  return lower.replace(/\s+/g, "-");
}

function inferCategory(product: AvantLinkProduct): GearCategory {
  const text = `${product.Product_Name} ${product.Category_Name}`.toLowerCase();
  if (text.includes("tent")) return "tents";
  if (text.includes("sleeping bag")) return "sleeping-bags";
  if (text.includes("backpack") || text.includes(" pack")) return "backpacks";
  if (text.includes("boot") || text.includes("shoe")) return "hiking-boots";
  if (text.includes("jacket") || text.includes("coat")) return "jackets";
  if (text.includes("stove") || text.includes("burner")) return "stoves";
  if (text.includes("filter") || text.includes("purif")) return "water-filters";
  if (text.includes("headlamp") || text.includes("flashlight")) return "headlamps";
  return "backpacks";
}

function avantlinkToOffer(product: AvantLinkProduct): PriceOffer {
  const retailerId = merchantIdToRetailerId(product.Merchant_Name);
  const priceCents =
    parsePrice(product.Sale_Price) || parsePrice(product.Retail_Price);
  const shippingCents = parsePrice(product.Shipping_Cost);

  return {
    retailerId,
    priceCents,
    shippingCents,
    currency: "USD",
    inStock: product.In_Stock === "Y",
    url: product.Buy_URL,
    lastUpdated: new Date().toISOString(),
  };
}

function avantlinkToProduct(product: AvantLinkProduct, category: GearCategory): Product {
  const retailerId = merchantIdToRetailerId(product.Merchant_Name);
  const msrpCents = parsePrice(product.Retail_Price);

  return {
    id: `avl-${retailerId}-${product.Merchant_Product_Id}`,
    name: product.Product_Name,
    brand: product.Brand_Name,
    category,
    description: product.Short_Description || product.Long_Description,
    msrpCents,
    imageUrl: product.Image_URL || undefined,
    specs: {},
    reviews: [], // AvantLink feeds don't include review data
    offers: [avantlinkToOffer(product)],
  };
}

export interface AvantLinkConfig {
  apiKey: string;
  websiteId: string;
  /** Subset of merchants to query. Defaults to all three. */
  merchants?: Array<"rei" | "backcountry" | "sierra">;
}

export class AvantLinkDataSource implements DataSource {
  private readonly merchants: string[];

  constructor(private readonly config: AvantLinkConfig) {
    this.merchants = config.merchants ?? ["rei", "backcountry", "sierra"];
  }

  private async fetch(params: Record<string, string>): Promise<AvantLinkProduct[]> {
    const url = new URL(BASE_URL);
    url.searchParams.set("affiliate_id", this.config.apiKey);
    url.searchParams.set("website_id", this.config.websiteId);
    url.searchParams.set("output", "6"); // JSON
    url.searchParams.set("module", "ProductSearch");
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await globalThis.fetch(url.toString());
    if (!res.ok) {
      throw new Error(`AvantLink API error ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as unknown;
    // AvantLink returns an array of results or an empty object on no results
    return Array.isArray(json) ? (json as AvantLinkProduct[]) : [];
  }

  async listRetailers(): Promise<Retailer[]> {
    return this.merchants.map((id) => ({ id, ...RETAILER_META[id]! }));
  }

  async listProducts(filter?: { category?: GearCategory }): Promise<Product[]> {
    const categories: GearCategory[] = filter?.category
      ? [filter.category]
      : (Object.keys(CATEGORY_KEYWORDS) as GearCategory[]);

    const merchantList = this.merchants
      .map((id) => MERCHANT_IDS[id])
      .filter(Boolean)
      .join(",");

    const results = await Promise.all(
      categories.map(async (category) => {
        const items = await this.fetch({
          keyword: CATEGORY_KEYWORDS[category],
          merchant_ids: merchantList,
          results_per_page: "50",
          page_number: "1",
          search_results_fields:
            "Merchant_Name,Merchant_Product_Id,Product_Name,Brand_Name,Short_Description,Long_Description,Retail_Price,Sale_Price,In_Stock,Buy_URL,Image_URL,Category_Name,Shipping_Cost",
        });

        return items.map((item) => avantlinkToProduct(item, category));
      }),
    );

    return results.flat();
  }

  async getProduct(id: string): Promise<Product | null> {
    if (!id.startsWith("avl-")) return null;

    // Decode "avl-{retailerId}-{merchantProductId}"
    const withoutPrefix = id.slice(4);
    const dashIndex = withoutPrefix.indexOf("-");
    if (dashIndex === -1) return null;
    const retailerId = withoutPrefix.slice(0, dashIndex);
    const merchantProductId = withoutPrefix.slice(dashIndex + 1);

    const merchantId = MERCHANT_IDS[retailerId];
    if (!merchantId) return null;

    const items = await this.fetch({
      merchant_ids: merchantId,
      merchant_product_id: merchantProductId,
      results_per_page: "1",
    });

    const item = items[0];
    if (!item) return null;
    return avantlinkToProduct(item, inferCategory(item));
  }
}
