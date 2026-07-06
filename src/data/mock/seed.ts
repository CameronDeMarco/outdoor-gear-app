import type { Product, Retailer } from "@/domain/types";
import { retailerSearchUrl } from "@/data/retailerSearch";

export const retailers: Retailer[] = [
  { id: "rei", name: "REI", url: "https://www.rei.com" },
  { id: "backcountry", name: "Backcountry", url: "https://www.backcountry.com" },
  { id: "amazon", name: "Amazon", url: "https://www.amazon.com" },
  { id: "moosejaw", name: "Moosejaw", url: "https://www.moosejaw.com" },
];

const now = "2026-06-28T00:00:00.000Z";

// Offer URLs are generated as retailer search links rather than guessed
// product IDs (ASINs, SKUs) — a guessed ID risks linking to the wrong
// product or a dead page, while a search always lands on real results.
function url(retailerId: string, productName: string): string {
  return retailerSearchUrl(retailerId, productName);
}

export const products: Product[] = [
  {
    id: "tent-copper-spur-hv-ul2",
    name: "Copper Spur HV UL2",
    brand: "Big Agnes",
    category: "tents",
    description:
      "Freestanding ultralight 2-person backpacking tent with steep walls and a generous vestibule. A long-running favorite for thru-hikers.",
    msrpCents: 54995,
    specs: { Weight: "3 lb 2 oz", Capacity: "2", Seasons: "3", "Floor Area": "29 sq ft" },
    reviews: [
      { source: "REI", averageRating: 4.6, reviewCount: 1320 },
      { source: "Backcountry", averageRating: 4.7, reviewCount: 540 },
      { source: "OutdoorGearLab", averageRating: 4.5, reviewCount: 88 },
    ],
    offers: [
      { retailerId: "rei", priceCents: 49995, shippingCents: 0, currency: "USD", inStock: true, url: url("rei", "Big Agnes Copper Spur HV UL2 Tent"), lastUpdated: now },
      { retailerId: "backcountry", priceCents: 47996, shippingCents: 0, currency: "USD", inStock: true, url: url("backcountry", "Big Agnes Copper Spur HV UL2 Tent"), lastUpdated: now },
      { retailerId: "amazon", priceCents: 51999, shippingCents: 0, currency: "USD", inStock: true, url: url("amazon", "Big Agnes Copper Spur HV UL2 Tent"), lastUpdated: now },
    ],
  },
  {
    id: "tent-half-dome-sl2",
    name: "Half Dome SL 2+",
    brand: "REI Co-op",
    category: "tents",
    description:
      "Roomy, durable 2-person tent that trades a little weight for comfort and value. A great first backpacking tent.",
    msrpCents: 28995,
    specs: { Weight: "4 lb 13 oz", Capacity: "2", Seasons: "3", "Floor Area": "35.8 sq ft" },
    reviews: [
      { source: "REI", averageRating: 4.5, reviewCount: 2870 },
      { source: "Amazon", averageRating: 4.4, reviewCount: 410 },
    ],
    offers: [
      { retailerId: "rei", priceCents: 24893, shippingCents: 0, currency: "USD", inStock: true, url: url("rei", "REI Co-op Half Dome SL 2+ Tent"), lastUpdated: now },
      { retailerId: "amazon", priceCents: 28995, shippingCents: 0, currency: "USD", inStock: false, url: url("amazon", "REI Co-op Half Dome SL 2+ Tent"), lastUpdated: now },
    ],
  },
  {
    id: "bag-magma-15",
    name: "Magma 15 Sleeping Bag",
    brand: "REI Co-op",
    category: "sleeping-bags",
    description:
      "850-fill goose down mummy bag rated to 15°F. Light, packable, and warm — punches well above its price.",
    msrpCents: 38995,
    specs: { "Temp Rating": "15°F", Fill: "850 down", Weight: "1 lb 14 oz" },
    reviews: [
      { source: "REI", averageRating: 4.7, reviewCount: 980 },
      { source: "OutdoorGearLab", averageRating: 4.6, reviewCount: 64 },
    ],
    offers: [
      { retailerId: "rei", priceCents: 33996, shippingCents: 0, currency: "USD", inStock: true, url: url("rei", "REI Co-op Magma 15 Sleeping Bag"), lastUpdated: now },
      { retailerId: "moosejaw", priceCents: 35995, shippingCents: 599, currency: "USD", inStock: true, url: url("moosejaw", "REI Co-op Magma 15 Sleeping Bag"), lastUpdated: now },
    ],
  },
  {
    id: "pack-atmos-ag-65",
    name: "Atmos AG 65 Pack",
    brand: "Osprey",
    category: "backpacks",
    description:
      "Anti-Gravity suspension makes 40 lb feel manageable on multi-day trips. The benchmark comfortable backpacking pack.",
    msrpCents: 34000,
    specs: { Volume: "65 L", Weight: "4 lb 9 oz", "Load Range": "30–50 lb" },
    reviews: [
      { source: "REI", averageRating: 4.6, reviewCount: 2100 },
      { source: "Backcountry", averageRating: 4.5, reviewCount: 730 },
      { source: "Amazon", averageRating: 4.7, reviewCount: 1540 },
    ],
    offers: [
      { retailerId: "rei", priceCents: 34000, shippingCents: 0, currency: "USD", inStock: true, url: url("rei", "Osprey Atmos AG 65 Pack"), lastUpdated: now },
      { retailerId: "backcountry", priceCents: 28900, shippingCents: 0, currency: "USD", inStock: true, url: url("backcountry", "Osprey Atmos AG 65 Pack"), lastUpdated: now },
      { retailerId: "amazon", priceCents: 31499, shippingCents: 0, currency: "USD", inStock: true, url: url("amazon", "Osprey Atmos AG 65 Pack"), lastUpdated: now },
    ],
  },
  {
    id: "boots-moab-3",
    name: "Moab 3 Hiking Boots",
    brand: "Merrell",
    category: "hiking-boots",
    description:
      "Comfortable-out-of-the-box day hiking boots with reliable grip. One of the best-selling hiking boots ever made.",
    msrpCents: 13500,
    specs: { Weight: "2 lb 1 oz (pair)", Waterproof: "Yes", "Drop": "11.5 mm" },
    reviews: [
      { source: "Amazon", averageRating: 4.5, reviewCount: 14200 },
      { source: "REI", averageRating: 4.3, reviewCount: 3100 },
    ],
    offers: [
      { retailerId: "amazon", priceCents: 11999, shippingCents: 0, currency: "USD", inStock: true, url: url("amazon", "Merrell Moab 3 Hiking Boots"), lastUpdated: now },
      { retailerId: "rei", priceCents: 13500, shippingCents: 0, currency: "USD", inStock: true, url: url("rei", "Merrell Moab 3 Hiking Boots"), lastUpdated: now },
    ],
  },
  {
    id: "stove-pocketrocket-2",
    name: "PocketRocket 2 Stove",
    brand: "MSR",
    category: "stoves",
    description:
      "Tiny, reliable canister stove that boils a liter in about 3.5 minutes. A backpacking staple.",
    msrpCents: 4995,
    specs: { Weight: "2.6 oz", "Boil Time": "3.5 min/L", Type: "Canister" },
    reviews: [
      { source: "Amazon", averageRating: 4.8, reviewCount: 9800 },
      { source: "REI", averageRating: 4.7, reviewCount: 1900 },
    ],
    offers: [
      { retailerId: "amazon", priceCents: 4495, shippingCents: 0, currency: "USD", inStock: true, url: url("amazon", "MSR PocketRocket 2 Stove"), lastUpdated: now },
      { retailerId: "rei", priceCents: 4995, shippingCents: 0, currency: "USD", inStock: true, url: url("rei", "MSR PocketRocket 2 Stove"), lastUpdated: now },
      { retailerId: "backcountry", priceCents: 4795, shippingCents: 0, currency: "USD", inStock: true, url: url("backcountry", "MSR PocketRocket 2 Stove"), lastUpdated: now },
    ],
  },
  {
    id: "filter-sawyer-squeeze",
    name: "Squeeze Water Filter",
    brand: "Sawyer",
    category: "water-filters",
    description:
      "0.1-micron hollow-fiber filter that screws onto standard bottles. Cheap, light, and rated for 100,000 gallons.",
    msrpCents: 3999,
    specs: { Weight: "3 oz", "Filter Size": "0.1 micron", Lifespan: "100,000 gal" },
    reviews: [
      { source: "Amazon", averageRating: 4.8, reviewCount: 26500 },
      { source: "REI", averageRating: 4.6, reviewCount: 2400 },
    ],
    offers: [
      { retailerId: "amazon", priceCents: 3499, shippingCents: 0, currency: "USD", inStock: true, url: url("amazon", "Sawyer Squeeze Water Filter"), lastUpdated: now },
      { retailerId: "rei", priceCents: 3999, shippingCents: 0, currency: "USD", inStock: true, url: url("rei", "Sawyer Squeeze Water Filter"), lastUpdated: now },
    ],
  },
  {
    id: "headlamp-spot-400",
    name: "Spot 400 Headlamp",
    brand: "Black Diamond",
    category: "headlamps",
    description:
      "400-lumen headlamp with a simple lock mode and red night vision. A dependable, affordable trail light.",
    msrpCents: 4995,
    specs: { "Max Lumens": "400", Weight: "2.6 oz", Waterproof: "IPX8" },
    reviews: [
      { source: "Amazon", averageRating: 4.6, reviewCount: 5200 },
      { source: "Backcountry", averageRating: 4.5, reviewCount: 280 },
    ],
    offers: [
      { retailerId: "amazon", priceCents: 3995, shippingCents: 0, currency: "USD", inStock: true, url: url("amazon", "Black Diamond Spot 400 Headlamp"), lastUpdated: now },
      { retailerId: "backcountry", priceCents: 4295, shippingCents: 0, currency: "USD", inStock: true, url: url("backcountry", "Black Diamond Spot 400 Headlamp"), lastUpdated: now },
    ],
  },
  {
    id: "jacket-nano-puff",
    name: "Nano Puff Jacket",
    brand: "Patagonia",
    category: "jackets",
    description:
      "Wind- and water-resistant synthetic insulation that stays warm when damp and packs into its own pocket.",
    msrpCents: 23900,
    specs: { Insulation: "60g PrimaLoft", Weight: "11.9 oz", Packable: "Yes" },
    reviews: [
      { source: "Backcountry", averageRating: 4.7, reviewCount: 860 },
      { source: "REI", averageRating: 4.6, reviewCount: 1240 },
    ],
    offers: [
      { retailerId: "backcountry", priceCents: 23900, shippingCents: 0, currency: "USD", inStock: true, url: url("backcountry", "Patagonia Nano Puff Jacket"), lastUpdated: now },
      { retailerId: "rei", priceCents: 23900, shippingCents: 0, currency: "USD", inStock: true, url: url("rei", "Patagonia Nano Puff Jacket"), lastUpdated: now },
      { retailerId: "moosejaw", priceCents: 19120, shippingCents: 0, currency: "USD", inStock: true, url: url("moosejaw", "Patagonia Nano Puff Jacket"), lastUpdated: now },
    ],
  },
  {
    id: "tent-flash-air-1",
    name: "Flash Air 1",
    brand: "REI Co-op",
    category: "tents",
    description:
      "Sub-2-pound semi-freestanding solo shelter. Newer model with few reviews so far — a test of the recommender's skepticism.",
    msrpCents: 29900,
    specs: { Weight: "1 lb 15 oz", Capacity: "1", Seasons: "3" },
    reviews: [{ source: "REI", averageRating: 5.0, reviewCount: 3 }],
    offers: [
      { retailerId: "rei", priceCents: 29900, shippingCents: 0, currency: "USD", inStock: true, url: url("rei", "REI Co-op Flash Air 1 Tent"), lastUpdated: now },
    ],
  },
];
