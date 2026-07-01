/**
 * Minimal shapes for the AvantLink Product Search API.
 * Full docs: https://classic.avantlink.com/api_docs/product_search.php
 *
 * The API returns XML or JSON depending on the `output` param.
 * We request JSON (output=6).
 */

export interface AvantLinkProductSearchResponse {
  /** Top-level array when output=6 and there are results */
  [index: number]: AvantLinkProduct;
  length?: number;
}

export interface AvantLinkProduct {
  /** Merchant name (e.g. "REI", "Backcountry") */
  Merchant_Name: string;
  /** Unique product SKU within the merchant */
  Merchant_Product_Id: string;
  Product_Name: string;
  Brand_Name: string;
  Short_Description: string;
  Long_Description: string;
  /** Retail (MSRP) price as a decimal string, e.g. "129.95" */
  Retail_Price: string;
  /** Sale price, may be empty or same as Retail_Price */
  Sale_Price: string;
  /** "Y" | "N" */
  In_Stock: string;
  Buy_URL: string;
  Image_URL: string;
  /** Pipe-separated breadcrumb, e.g. "Camping|Tents|Backpacking Tents" */
  Category_Name: string;
  /** Shipping cost as decimal string; empty = free */
  Shipping_Cost: string;
  /** Comma-separated key:value pairs or empty string */
  Custom_1: string;
}
