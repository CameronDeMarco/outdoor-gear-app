import type { DataSource } from "@/data/source";
import type { GearCategory, Product, PriceOffer, ReviewSummary, Retailer } from "@/domain/types";
import type {
  RainforestSearchResult,
  RainforestSearchItem,
  RainforestProductResult,
  RainforestProduct,
} from "./types";

const BASE_URL = "https://api.rainforestapi.com/request";

/**
 * Maps our GearCategory values to search terms that return good Amazon results.
 * Amazon doesn't have a direct category API, so we search by keyword + department.
 */
const CATEGORY_QUERIES: Record<GearCategory, { keywords: string; amazonDept: string }> = {
  tents: { keywords: "backpacking tent", amazonDept: "sporting-goods" },
  "sleeping-bags": { keywords: "backpacking sleeping bag", amazonDept: "sporting-goods" },
  backpacks: { keywords: "hiking backpack", amazonDept: "sporting-goods" },
  "hiking-boots": { keywords: "hiking boots waterproof", amazonDept: "shoes" },
  jackets: { keywords: "outdoor hiking jacket", amazonDept: "sporting-goods" },
  stoves: { keywords: "backpacking camp stove", amazonDept: "sporting-goods" },
  "water-filters": { keywords: "backpacking water filter", amazonDept: "sporting-goods" },
  headlamps: { keywords: "hiking headlamp rechargeable", amazonDept: "sporting-goods" },
};

const AMAZON_RETAILER: Retailer = {
  id: "amazon",
  name: "Amazon",
  url: "https://www.amazon.com",
};

function dollarsToCents(value: number): number {
  return Math.round(value * 100);
}

function inferCategory(item: RainforestSearchItem | RainforestProduct): GearCategory {
  const title = ("title" in item ? item.title : "").toLowerCase();
  if (title.includes("tent")) return "tents";
  if (title.includes("sleeping bag")) return "sleeping-bags";
  if (title.includes("backpack") || title.includes("pack")) return "backpacks";
  if (title.includes("boot") || title.includes("shoe")) return "hiking-boots";
  if (title.includes("jacket") || title.includes("coat")) return "jackets";
  if (title.includes("stove") || title.includes("burner")) return "stoves";
  if (title.includes("filter") || title.includes("purif")) return "water-filters";
  if (title.includes("headlamp") || title.includes("flashlight")) return "headlamps";
  return "backpacks"; // fallback
}

function searchItemToProduct(item: RainforestSearchItem, category: GearCategory): Product {
  const priceCents = item.price?.value ? dollarsToCents(item.price.value) : 0;
  const msrpCents = item.rrp?.value ? dollarsToCents(item.rrp.value) : priceCents;
  const inStock = item.availability?.type !== "Out of Stock";

  const offer: PriceOffer = {
    retailerId: "amazon",
    priceCents,
    shippingCents: item.is_prime ? 0 : 0, // unknown at search level; assume free
    currency: "USD",
    inStock,
    url: item.link,
    lastUpdated: new Date().toISOString(),
  };

  const reviews: ReviewSummary[] = item.rating
    ? [
        {
          source: "Amazon",
          averageRating: item.rating,
          reviewCount: item.ratings_total ?? 0,
          url: item.link,
        },
      ]
    : [];

  return {
    id: `amz-${item.asin}`,
    name: item.title,
    brand: item.brand ?? "Unknown",
    category,
    description: "",
    msrpCents,
    imageUrl: item.image,
    specs: {},
    reviews,
    offers: priceCents > 0 ? [offer] : [],
  };
}

function richProductToProduct(product: RainforestProduct, category: GearCategory): Product {
  const buybox = product.buybox_winner;
  const priceCents = buybox?.price?.value
    ? dollarsToCents(buybox.price.value)
    : product.price?.value
      ? dollarsToCents(product.price.value)
      : 0;
  const shippingCents = buybox?.shipping?.price?.value
    ? dollarsToCents(buybox.shipping.price.value)
    : 0;
  const msrpCents = product.rrp?.value ? dollarsToCents(product.rrp.value) : priceCents;
  const inStock = buybox?.availability?.type !== "Out of Stock";

  const offer: PriceOffer = {
    retailerId: "amazon",
    priceCents,
    shippingCents,
    currency: "USD",
    inStock,
    url: product.link,
    lastUpdated: new Date().toISOString(),
  };

  const reviews: ReviewSummary[] = product.rating
    ? [
        {
          source: "Amazon",
          averageRating: product.rating,
          reviewCount: product.ratings_total ?? 0,
          url: product.link,
        },
      ]
    : [];

  const specs: Record<string, string> = {};
  for (const spec of product.specifications ?? []) {
    specs[spec.name] = spec.value;
  }

  const description =
    product.description ??
    (product.feature_bullets ? product.feature_bullets.slice(0, 3).join(" ") : "");

  return {
    id: `amz-${product.asin}`,
    name: product.title,
    brand: product.brand ?? "Unknown",
    category,
    description,
    msrpCents,
    imageUrl: product.main_image?.link,
    specs,
    reviews,
    offers: priceCents > 0 ? [offer] : [],
  };
}

export class RainforestDataSource implements DataSource {
  constructor(private readonly apiKey: string) {}

  private async fetch<T>(params: Record<string, string>): Promise<T> {
    const url = new URL(BASE_URL);
    url.searchParams.set("api_key", this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await globalThis.fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Rainforest API error ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async listRetailers(): Promise<Retailer[]> {
    return [AMAZON_RETAILER];
  }

  async listProducts(filter?: { category?: GearCategory }): Promise<Product[]> {
    const categories: GearCategory[] = filter?.category
      ? [filter.category]
      : (Object.keys(CATEGORY_QUERIES) as GearCategory[]);

    const results = await Promise.all(
      categories.map(async (category) => {
        const { keywords, amazonDept } = CATEGORY_QUERIES[category];
        const data = await this.fetch<RainforestSearchResult>({
          type: "search",
          amazon_domain: "amazon.com",
          search_term: keywords,
          category_id: amazonDept,
          sort_by: "average_review",
          exclude_sponsored: "true",
        });
        return (data.search_results ?? [])
          .filter((item) => !item.sponsered && item.price?.value)
          .map((item) => searchItemToProduct(item, category));
      }),
    );

    return results.flat();
  }

  async getProduct(id: string): Promise<Product | null> {
    if (!id.startsWith("amz-")) return null;
    const asin = id.slice(4);

    const data = await this.fetch<RainforestProductResult>({
      type: "product",
      amazon_domain: "amazon.com",
      asin,
      include_summarization_attributes: "false",
    });

    if (!data.product) return null;
    const category = inferCategory(data.product);
    return richProductToProduct(data.product, category);
  }
}
