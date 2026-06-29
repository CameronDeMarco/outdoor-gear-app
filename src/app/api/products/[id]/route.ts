import { NextResponse } from "next/server";
import { getDataSource } from "@/data";
import { scanPrices } from "@/domain/prices";
import { scoreProduct } from "@/domain/recommend";

/**
 * GET /api/products/:id
 * Returns the product plus a computed price scan and recommendation score.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = await getDataSource().getProduct(id);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const scan = scanPrices(product);
  const scored = scoreProduct(product);

  return NextResponse.json({
    product,
    priceScan: {
      bestRetailerId: scan.best?.retailerId ?? null,
      bestTotalCents: scan.best?.totalCents ?? null,
      savingsVsHighestCents: scan.savingsVsHighestCents,
      savingsVsMsrpCents: scan.savingsVsMsrpCents,
      ranked: scan.ranked,
    },
    recommendation: {
      score: Number(scored.score.toFixed(3)),
      adjustedRating: Number(scored.bayesianRating.toFixed(2)),
      totalReviews: scored.totalReviews,
      reasons: scored.reasons,
    },
  });
}
