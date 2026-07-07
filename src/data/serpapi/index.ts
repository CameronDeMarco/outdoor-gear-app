import type { DataSource } from "@/data/source";
import type { GearCategory, Product, PriceOffer, ReviewSummary, Retailer } from "@/domain/types";
import type {
  SerpApiShoppingResponse,
  SerpApiShoppingResult,
  SerpApiImmersiveResponse,
  SerpApiStore,
} from "./types";
import { retailerSearchUrl } from "@/data/retailerSearch";

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
  // A fixed category (category browse) or null to infer per product (search).
  category: GearCategory | null,
  tokenById?: Map<string, string>,
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
        url: buildRetailerUrl(retailerId, primary.title, item.link, item.product_link),
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
    const id = `serp-${googleId}~${normalizeTitle(primary.title)}`;

    // Remember the immersive token so the detail page can expand this listing
    // into per-seller offers without re-searching.
    if (tokenById && primary.immersive_product_page_token) {
      tokenById.set(id, primary.immersive_product_page_token);
    }

    products.push({
      id,
      name: primary.title,
      brand: extractBrand(primary.title),
      category: category ?? inferCategory(primary.title.toLowerCase()),
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

/**
 * Convert immersive per-seller stores into our PriceOffer shape.
 * Each store carries a direct retailer link and its own price + shipping,
 * so this is what powers the multi-seller price comparison on the detail page.
 */
function storesToOffers(stores: SerpApiStore[], title: string): PriceOffer[] {
  const byRetailer = new Map<string, PriceOffer>();

  for (const store of stores) {
    if (store.extracted_price == null || store.extracted_price <= 0) continue;

    const retailerId = normalizeRetailerId(store.name);
    const priceCents = Math.round(store.extracted_price * 100);
    const shippingCents =
      store.shipping_extracted != null
        ? Math.round(store.shipping_extracted * 100)
        : parseShippingCents(store.shipping);
    const details = (store.details_and_offers ?? []).join(" ");
    const inStock = !/out of stock/i.test(details);
    const url = isDirectRetailerUrl(store.link)
      ? store.link
      : retailerSearchUrl(retailerId, title) || store.link || "";

    const offer: PriceOffer = {
      retailerId,
      priceCents,
      shippingCents,
      currency: "USD",
      inStock,
      url,
      lastUpdated: new Date().toISOString(),
    };

    // Keep the cheapest landed cost when a retailer appears more than once.
    const existing = byRetailer.get(retailerId);
    if (!existing || priceCents + shippingCents < existing.priceCents + existing.shippingCents) {
      byRetailer.set(retailerId, offer);
    }
  }

  return Array.from(byRetailer.values());
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
}

/** Returns the URL only if it points directly to a known retailer (not Google). */
function isDirectRetailerUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return !host.includes("google.") && !host.includes("googleadservices.");
  } catch {
    return false;
  }
}

function buildRetailerUrl(
  retailerId: string,
  title: string,
  directUrl?: string,
  fallbackProductLink?: string,
): string {
  if (isDirectRetailerUrl(directUrl)) return directUrl;
  const searchUrl = retailerSearchUrl(retailerId, title);
  if (searchUrl) return searchUrl;
  // For unrecognized retailers, send to their Google Shopping product page —
  // the user can at least see the product and click through to the retailer.
  return fallbackProductLink ?? "";
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

  /**
   * Maps our product id → the immersive token captured during listProducts,
   * so a detail-page getProduct can fetch per-seller offers with just one API
   * call instead of re-searching first. Persists for the process lifetime
   * (getDataSource returns a singleton).
   */
  private readonly tokenById = new Map<string, string>();

  /**
   * Base product (name, brand, image, rating) captured during listProducts, so a
   * detail view can skip the re-search and go straight to the immersive call.
   */
  private readonly baseById = new Map<string, Product>();

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

  /** Fetch per-seller offers for a product via the immersive product endpoint. */
  private async fetchImmersive(token: string): Promise<SerpApiStore[]> {
    const url = new URL(BASE_URL);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("engine", "google_immersive_product");
    url.searchParams.set("gl", "us");
    url.searchParams.set("hl", "en");
    url.searchParams.set("page_token", token);

    const res = await globalThis.fetch(url.toString(), {
      next: { revalidate: 3600 },
    } as RequestInit);

    if (!res.ok) {
      throw new Error(`SerpAPI immersive error ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as SerpApiImmersiveResponse;
    if (data.error) throw new Error(`SerpAPI immersive: ${data.error}`);
    return data.product_results?.stores ?? [];
  }

  async listRetailers(): Promise<Retailer[]> {
    return [
      { id: "rei", name: "REI", url: "https://www.rei.com" },
      { id: "amazon", name: "Amazon", url: "https://www.amazon.com" },
      { id: "backcountry", name: "Backcountry", url: "https://www.backcountry.com" },
      { id: "sierra", name: "Sierra", url: "https://www.sierra.com" },
      { id: "moosejaw", name: "Moosejaw", url: "https://www.moosejaw.com" },
      { id: "evo", name: "evo", url: "https://www.evo.com" },
      { id: "ebay", name: "eBay", url: "https://www.ebay.com" },
      { id: "walmart", name: "Walmart", url: "https://www.walmart.com" },
      { id: "target", name: "Target", url: "https://www.target.com" },
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
        return groupByProduct(data.shopping_results ?? [], category, this.tokenById);
      }),
    );

    const all = results.flat();
    for (const product of all) this.baseById.set(product.id, product);
    return all;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const q = query.trim();
    if (!q) return [];

    const data = await this.fetch({ q, num: "20" });
    if (data.error) throw new Error(`SerpAPI: ${data.error}`);

    // Pass null so each result's category is inferred from its own title —
    // search spans everything, not one fixed category.
    const products = groupByProduct(data.shopping_results ?? [], null, this.tokenById);
    for (const product of products) this.baseById.set(product.id, product);
    return products;
  }

  async getProduct(id: string): Promise<Product | null> {
    if (!id.startsWith("serp-")) return null;

    // Warm path: listProducts already ran this process, so we have the base
    // product and immersive token cached — no re-search needed.
    let base = this.baseById.get(id);
    let token = this.tokenById.get(id);

    // Cold path (e.g. direct link, fresh process): re-search by the name slug
    // encoded in the id to recover the base product and token.
    if (!base || !token) {
      const withoutPrefix = id.slice(5); // strip "serp-"
      const tildeIdx = withoutPrefix.indexOf("~");
      const nameSlug = tildeIdx !== -1 ? withoutPrefix.slice(tildeIdx + 1) : withoutPrefix;
      const query = nameSlug.replace(/-/g, " ");

      const data = await this.fetch({ q: query, num: "10" });
      if (data.error || !data.shopping_results?.length) return base ?? null;

      const category = inferCategory((data.shopping_results[0]?.title ?? "").toLowerCase());
      const products = groupByProduct(data.shopping_results, category, this.tokenById);
      const found = products.find((p) => p.id === id) ?? products[0];
      base = base ?? found;
      token = token ?? (found ? this.tokenById.get(found.id) : undefined);
    }

    if (!base) return null;

    // Expand into per-seller offers (direct links, real prices) via the
    // immersive endpoint. If it fails, fall back to the single search offer.
    if (token) {
      try {
        const stores = await this.fetchImmersive(token);
        const offers = storesToOffers(stores, base.name);
        if (offers.length) {
          return { ...base, id, offers };
        }
      } catch (err) {
        console.warn("[serpapi] immersive fetch failed, using search offer:", (err as Error).message);
      }
    }

    // Keep the original id so navigation stays consistent.
    return { ...base, id };
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
