/**
 * Search-URL templates for retailers, used whenever we don't have a verified
 * direct product link. Guessing a product ID (Amazon ASIN, REI SKU, etc.)
 * risks linking to the wrong product or a dead page — a search always lands
 * the user on real, relevant results.
 */
const RETAILER_SEARCH_TEMPLATES: Record<string, string> = {
  amazon: "https://www.amazon.com/s?k=",
  rei: "https://www.rei.com/search?q=",
  backcountry: "https://www.backcountry.com/search?q=",
  sierra: "https://www.sierra.com/search?q=",
  moosejaw: "https://www.moosejaw.com/search?q=",
  evo: "https://www.evo.com/search?query=",
  steepandcheap: "https://www.steepandcheap.com/search?q=",
  "sports-basement": "https://www.sportsbasement.com/search/?q=",
  walmart: "https://www.walmart.com/search?q=",
  target: "https://www.target.com/s?searchTerm=",
  zappos: "https://www.zappos.com/search?term=",
  "competitive-cyclist": "https://www.competitivecyclist.com/search?query=",
  campsaver: "https://www.campsaver.com/search?q=",
  "eastern-mountain-sports": "https://www.ems.com/search?q=",
};

export function retailerSearchUrl(retailerId: string, query: string): string {
  const template = RETAILER_SEARCH_TEMPLATES[retailerId];
  return template ? `${template}${encodeURIComponent(query)}` : "";
}
