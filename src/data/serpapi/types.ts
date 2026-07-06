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
  /** True when Google has multiple sellers behind this single listing. */
  multiple_sources?: boolean;
  /**
   * Token for the google_immersive_product engine, which expands this listing
   * into per-seller offers with direct retailer links. This is the only way to
   * get individual seller prices + direct URLs.
   */
  immersive_product_page_token?: string;
  /** Shipping description, e.g. "Free delivery", "+$5.99 shipping" */
  delivery?: string;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  /** "Out of stock" when set */
  tag?: string;
}

/** Response from engine=google_immersive_product — per-seller offers for one product. */
export interface SerpApiImmersiveResponse {
  search_metadata: { status: string };
  error?: string;
  product_results?: {
    title?: string;
    brand?: string;
    rating?: number;
    reviews?: number;
    stores?: SerpApiStore[];
  };
}

/** A single seller's offer for a product, from the immersive product endpoint. */
export interface SerpApiStore {
  /** Seller name, e.g. "REI", "eBay", "Backcountry.com" */
  name: string;
  /** Direct link to the product on the seller's own site. */
  link: string;
  price?: string;
  extracted_price?: number;
  /** Shipping description, e.g. "Free", "+ $5.95" */
  shipping?: string;
  shipping_extracted?: number;
  total?: string;
  extracted_total?: number;
  /** e.g. "Best price", "Most popular" */
  tag?: string;
  rating?: number;
  reviews?: number;
  /** Free-text lines like "In stock online", "Out of stock", "90-day returns" */
  details_and_offers?: string[];
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
