import { test } from "node:test";
import assert from "node:assert/strict";
import type { Product } from "./types";
import { bayesianRating, recommend } from "./recommend";
import { scanPrices } from "./prices";

function makeProduct(over: Partial<Product>): Product {
  return {
    id: "p",
    name: "Test",
    brand: "Brand",
    category: "tents",
    description: "",
    msrpCents: 10000,
    specs: {},
    reviews: [],
    offers: [],
    ...over,
  };
}

test("bayesian rating pulls low-volume products toward the prior", () => {
  const oneFiveStar = makeProduct({
    reviews: [{ source: "x", averageRating: 5, reviewCount: 1 }],
  });
  const manyHighStar = makeProduct({
    reviews: [{ source: "x", averageRating: 4.6, reviewCount: 2000 }],
  });

  // The single 5-star review should NOT outrank the well-reviewed 4.6.
  assert.ok(bayesianRating(oneFiveStar) < bayesianRating(manyHighStar));
  // And it should sit below its own naive average of 5.
  assert.ok(bayesianRating(oneFiveStar) < 5);
});

test("recommend ranks the heavily-reviewed product first", () => {
  const sparse = makeProduct({
    id: "sparse",
    reviews: [{ source: "x", averageRating: 5, reviewCount: 2 }],
  });
  const proven = makeProduct({
    id: "proven",
    reviews: [{ source: "x", averageRating: 4.7, reviewCount: 5000 }],
  });

  const ranked = recommend([sparse, proven]);
  assert.equal(ranked[0]?.product.id, "proven");
});

test("scanPrices picks the lowest landed cost among in-stock offers", () => {
  const product = makeProduct({
    msrpCents: 10000,
    offers: [
      { retailerId: "a", priceCents: 9000, shippingCents: 0, currency: "USD", inStock: true, url: "", lastUpdated: "" },
      { retailerId: "b", priceCents: 8500, shippingCents: 1000, currency: "USD", inStock: true, url: "", lastUpdated: "" },
      { retailerId: "c", priceCents: 8000, shippingCents: 0, currency: "USD", inStock: false, url: "", lastUpdated: "" },
    ],
  });

  const scan = scanPrices(product);
  // 'a' (9000+0) beats 'b' (8500+1000); 'c' is cheaper but out of stock.
  assert.equal(scan.best?.retailerId, "a");
  assert.equal(scan.best?.totalCents, 9000);
  assert.equal(scan.savingsVsMsrpCents, 1000);
});
