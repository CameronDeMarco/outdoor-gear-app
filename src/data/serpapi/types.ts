/**
 * Minimal types for SerpAPI Google Shopping responses.
 * Full docs: https://serpapi.com/google-shopping-api
 */

export interface SerpApiShoppingResponse {
  search_metadata: { status: string };
  shopping_results?: SerpApiShoppingResult[];
  error?: string;
}

export interface SerpApiShoppingResult {
  position: number;
  /** Retailer name, e.g. "REI", "Amazon.com", "Backcountry" */
  source: string;
  title: string;
  /** Google's stable product ID — same product across retailers shares this. */
  product_id?: string;
  price?: string;
  extracted_price?: number;
  /** Direct retailer URL. Not always present — some listings only have a Google redirect. */
  link?: string;
  /** Google Shopping product page URL (fallback when link is absent). */
  product_link?: string;
  /** Shipping description, e.g. "Free delivery", "+$5.99 shipping" */
  delivery?: string;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  /** "Out of stock" when set */
  tag?: string;
}

/** Response from engine=google_product — richer structured data for a single product. */
export interface SerpApiProductResponse {
  search_metadata: { status: string };
  error?: string;
  product_results?: {
    title: string;
    description?: string;
    media?: Array<{ type: string; link: string }>;
    reviews?: { rating?: number; reviews?: number };
    prices?: Array<{
      name: string;
      base_price?: string;
      total_price?: string;
      additional_price?: { shipping?: string };
      link: string;
      extracted_price?: number;
    }>;
    specifications?: Array<{ title: string; items: Array<{ key: string; value: string }> }>;
  };
}
