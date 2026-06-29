import { NextResponse } from "next/server";
import { getDataSource } from "@/data";
import { recommend } from "@/domain/recommend";
import type { GearCategory } from "@/domain/types";
import { ALL_CATEGORIES } from "@/lib/ui";

/**
 * GET /api/recommendations?category=tents&inStock=true&limit=10
 * Returns review-driven recommendations, best first.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category") ?? undefined;
  const category =
    categoryParam && (ALL_CATEGORIES as string[]).includes(categoryParam)
      ? (categoryParam as GearCategory)
      : undefined;
  const inStockOnly = searchParams.get("inStock") === "true";
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;

  const products = await getDataSource().listProducts();
  const results = recommend(products, { category, inStockOnly, limit });

  return NextResponse.json({
    count: results.length,
    results: results.map((r) => ({
      id: r.product.id,
      name: r.product.name,
      brand: r.product.brand,
      category: r.product.category,
      score: Number(r.score.toFixed(3)),
      adjustedRating: Number(r.bayesianRating.toFixed(2)),
      totalReviews: r.totalReviews,
      bestPriceCents: r.bestPriceCents,
      reasons: r.reasons,
    })),
  });
}
