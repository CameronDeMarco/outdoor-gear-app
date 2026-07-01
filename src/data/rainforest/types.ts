/**
 * Minimal TypeScript shapes for the Rainforest API responses we actually use.
 * Full docs: https://www.rainforestapi.com/docs
 *
 * We only type the fields we read; unknown fields are safe to ignore.
 */

export interface RainforestSearchResult {
  request_info: { success: boolean };
  search_results?: RainforestSearchItem[];
}

export interface RainforestSearchItem {
  asin: string;
  title: string;
  brand?: string;
  link: string;
  image?: string;
  rating?: number;
  ratings_total?: number;
  price?: { value: number; currency: string };
  rrp?: { value: number; currency: string }; // recommended retail price (MSRP)
  is_prime?: boolean;
  availability?: { type: string }; // "In Stock" | "Out of Stock" | ...
  sponsered?: boolean;
}

export interface RainforestProductResult {
  request_info: { success: boolean };
  product?: RainforestProduct;
}

export interface RainforestProduct {
  asin: string;
  title: string;
  brand?: string;
  link: string;
  main_image?: { link: string };
  description?: string;
  feature_bullets?: string[];
  rating?: number;
  ratings_total?: number;
  price?: { value: number; currency: string };
  rrp?: { value: number; currency: string };
  buybox_winner?: {
    price?: { value: number; currency: string };
    shipping?: { price?: { value: number } };
    is_prime?: boolean;
    availability?: { type: string };
  };
  specifications?: Array<{ name: string; value: string }>;
  category_path?: Array<{ name: string }>;
}
