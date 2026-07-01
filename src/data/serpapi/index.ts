import type { DataSource } from "@/data/source";
import type { GearCategory, Product, PriceOffer, ReviewSummary, Retailer } from "@/domain/types";
import type { SerpApiShoppingResponse, SerpApiShoppingResult, SerpApiProductResponse } from "./types";

const BASE_URL = "https://serpapi.com/search";

const CATEGORY_QUERIES: Record<GearCategory, string> = {
  tents: "backpacking tent lightweight adults",
  "sleeping-bags": "backpacking sleeping bag mummy adults",
  backpacks: "hiking backpacking pack 50L 60L 65L",
  "hiking-boots": "hiking boots waterproof trail adults",
  jackets: "hiking rain shell insulated jacket backpacking",
  stoves: "backpacking camp stove canister burner",
  "water-filters": "backpacking water filter purifier hiking",
  headlamps: "headlamp camping hiking rechargeable LED",
};

/**
 * Normalize a retailer's display name from Google Shopping to our retailer IDs.
 * Google returns names like "REI", "Amazon.com", "Backcountry.com".
 */
function normalizeRetailerId(source: string): string {
  const s = source.toLowerCase();
  if (s.includes("rei")) return "rei";
  if (s.includes("amazon")) return "amazon";
  if (s.includes("backcountry")) return "backcountry";
  if (s.includes("sierra")) return "sierra";
  if (s.includes("moosejaw")) return "moosejaw";
  if (s.includes("evo")) return "evo";
  if (s.includes("steep")) return "steepandcheap";
  return s.replace(/[^a-z0-9]+/g, "-").replace(/\.com$/, "");
}

function parseExtractedPrice(value: string): number {
  const match = value.match(/\$([0-9]+(?:\.[0-9]{2})?)/);
  return match ? Math.round(parseFloat(match[1]!) * 100) : 0;
}

function parseShippingCents(delivery?: string): number {
  if (!delivery) return 0;
  if (/free/i.test(delivery)) return 0;
  const match = delivery.match(/\$([0-9]+(?:\.[0-9]{2})?)/);
  return match ? Math.round(parseFloat(match[1]!) * 100) : 0;
}

/**
 * The key insight of the SerpAPI adapter:
 * Google Shopping returns one listing per retailer for the same product.
 * We group listings by Google's product_id (falling back to normalized title)
 * so each unique product gets all its retailer offers merged into one Product.
 */
function groupByProduct(
  results: SerpApiShoppingResult[],
  category: GearCategory,
): Product[] {
  const groups = new Map<string, SerpApiShoppingResult[]>();

  for (const item of results) {
    // Skip clearly non-product results
    if (!item.extracted_price || item.extracted_price <= 0) continue;
    if (/\b(kid|boys?|girls?|child|toddler|youth|junior|replacement|cartridge|refill)\b/i.test(item.title)) continue;

    const key = item.product_id ?? normalizeTitle(item.title);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  const products: Product[] = [];

  for (const group of groups.values()) {
    const primary = group[0]!;

    // Build one offer per retailer, deduped by retailerId
    const offersByRetailer = new Map<string, PriceOffer>();
    for (const item of group) {
      const retailerId = normalizeRetailerId(item.source);
      if (offersByRetailer.has(retailerId)) continue;
      offersByRetailer.set(retailerId, {
        retailerId,
        priceCents: Math.round(item.extracted_price! * 100),
        shippingCents: parseShippingCents(item.delivery),
        currency: "USD",
        inStock: item.tag !== "Out of stock",
        // link = direct retailer page; fall back to Google Shopping product page
        url: item.link ?? item.product_link ?? "",
        lastUpdated: new Date().toISOString(),
      });
    }

    // Aggregate ratings: use the listing with the most reviews as authoritative
    const withRatings = group.filter((i) => i.rating && i.reviews);
    withRatings.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
    const reviews: ReviewSummary[] = withRatings.slice(0, 1).map((i) => ({
      source: "Google Shopping",
      averageRating: i.rating!,
      reviewCount: i.reviews!,
    }));

    // MSRP = highest price seen across retailers
    const prices = group.map((i) => Math.round(i.extracted_price! * 100));
    const msrpCents = Math.max(...prices);

    // ID encodes both the Google product ID and a name slug (separated by ~)
    // so getProduct can fall back to a shopping search if needed.
    const googleId = primary.product_id ?? normalizeTitle(primary.title);
    products.push({
      id: `serp-${googleId}~${normalizeTitle(primary.title)}`,
      name: primary.title,
      brand: extractBrand(primary.title),
      category,
      description: "",
      msrpCents,
      imageUrl: primary.thumbnail,
      specs: {},
      reviews,
      offers: Array.from(offersByRetailer.values()),
    });
  }

  return products;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
}

const KNOWN_BRANDS = [
  "MSR", "Black Diamond", "Osprey", "Big Agnes", "Nemo", "Marmot",
  "Patagonia", "Arc'teryx", "Columbia", "The North Face", "Petzl",
  "Sawyer", "Platypus", "Katadyn", "LifeStraw", "Hydrapak", "Nalgene",
  "Jetboil", "Snow Peak", "Primus", "BioLite", "GSI", "Sea to Summit",
  "Merrell", "Salomon", "Vasque", "Keen", "La Sportiva", "Oboz", "Danner",
  "Gregory", "Deuter", "Mystery Ranch", "Zpacks", "REI Co-op",
  "Western Mountaineering", "Enlightened Equipment", "Feathered Friends",
  "Fenix", "Nitecore", "Princeton Tec", "Energizer", "Black Diamond",
];

function extractBrand(title: string): string {
  for (const brand of KNOWN_BRANDS) {
    if (title.toLowerCase().startsWith(brand.toLowerCase())) return brand;
  }
  const first = title.split(/[\s,(-]/)[0] ?? "";
  return /^[A-Za-z]{2,}/.test(first) ? first : "Unknown";
}

export class SerpApiDataSource implements DataSource {
  constructor(private readonly apiKey: string) {}

  private async fetch(params: Record<string, string>): Promise<SerpApiShoppingResponse> {
    const url = new URL(BASE_URL);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("engine", "google_shopping");
    url.searchParams.set("gl", "us");
    url.searchParams.set("hl", "en");
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await globalThis.fetch(url.toString(), {
      next: { revalidate: 3600 },
    } as RequestInit);

    if (!res.ok) {
      throw new Error(`SerpAPI error ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<SerpApiShoppingResponse>;
  }

  async listRetailers(): Promise<Retailer[]> {
    return [
      { id: "rei", name: "REI", url: "https://www.rei.com" },
      { id: "amazon", name: "Amazon", url: "https://www.amazon.com" },
      { id: "backcountry", name: "Backcountry", url: "https://www.backcountry.com" },
      { id: "sierra", name: "Sierra", url: "https://www.sierra.com" },
      { id: "moosejaw", name: "Moosejaw", url: "https://www.moosejaw.com" },
      { id: "evo", name: "evo", url: "https://www.evo.com" },
    ];
  }

  async listProducts(filter?: { category?: GearCategory }): Promise<Product[]> {
    const categories: GearCategory[] = filter?.category
      ? [filter.category]
      : (Object.keys(CATEGORY_QUERIES) as GearCategory[]);

    const results = await Promise.all(
      categories.map(async (category) => {
        const data = await this.fetch({
          q: CATEGORY_QUERIES[category],
          num: "20",
        });
        if (data.error) throw new Error(`SerpAPI: ${data.error}`);
        return groupByProduct(data.shopping_results ?? [], category);
      }),
    );

    return results.flat();
  }

  async getProduct(id: string): Promise<Product | null> {
    if (!id.startsWith("serp-")) return null;

    // ID format: "serp-{googleId}~{nameSlug}"
    // The CachingDataSource populates this from listProducts so this path is
    // rarely hit. When it is (e.g. direct URL), re-search by the name slug.
    const withoutPrefix = id.slice(5);
    const tildeIdx = withoutPrefix.indexOf("~");
    const nameSlug = tildeIdx !== -1 ? withoutPrefix.slice(tildeIdx + 1) : withoutPrefix;
    const query = nameSlug.replace(/-/g, " ");

    const data = await this.fetch({ q: query, num: "10" });
    if (data.error || !data.shopping_results?.length) return null;

    const category = inferCategory((data.shopping_results[0]?.title ?? "").toLowerCase());
    const products = groupByProduct(data.shopping_results, category);
    const found = products.find((p) => p.id === id) ?? products[0];
    if (!found) return null;
    // Keep the original id so navigation stays consistent.
    return { ...found, id };
  }
}

function inferCategory(title: string): GearCategory {
  if (title.includes("tent")) return "tents";
  if (title.includes("sleeping bag")) return "sleeping-bags";
  if (title.includes("backpack") || title.includes(" pack")) return "backpacks";
  if (title.includes("boot") || title.includes("shoe")) return "hiking-boots";
  if (title.includes("jacket") || title.includes("shell")) return "jackets";
  if (title.includes("stove") || title.includes("burner")) return "stoves";
  if (title.includes("filter") || title.includes("purif")) return "water-filters";
  if (title.includes("headlamp") || title.includes("flashlight")) return "headlamps";
  return "backpacks";
}
