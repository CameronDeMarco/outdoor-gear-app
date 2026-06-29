import Link from "next/link";
import { getDataSource } from "@/data";
import { recommend } from "@/domain/recommend";
import type { GearCategory } from "@/domain/types";
import { formatUsd, formatRating } from "@/lib/format";
import { ALL_CATEGORIES, CATEGORY_LABELS, starGlyphs } from "@/lib/ui";

function isCategory(value: string | undefined): value is GearCategory {
  return !!value && (ALL_CATEGORIES as string[]).includes(value);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = isCategory(category) ? category : undefined;

  const products = await getDataSource().listProducts();
  const results = recommend(products, { category: active, limit: 24 });

  return (
    <>
      <nav className="filters">
        <Link href="/" className={`chip ${active ? "" : "active"}`}>
          All
        </Link>
        {ALL_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/?category=${c}`}
            className={`chip ${active === c ? "active" : ""}`}
          >
            {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </nav>

      <div className="grid">
        {results.map((r, i) => (
          <Link key={r.product.id} href={`/product/${r.product.id}`} className="card">
            <span className="rank">#{i + 1} recommended</span>
            <div>
              <h3>{r.product.name}</h3>
              <div className="brand">{r.product.brand}</div>
            </div>
            <div className="rating">
              <span className="stars">{starGlyphs(r.bayesianRating)}</span>
              {formatRating(r.bayesianRating)}
              <span className="muted">({r.totalReviews.toLocaleString()} reviews)</span>
            </div>
            <div>
              {r.bestPriceCents !== null ? (
                <>
                  <span className="price">{formatUsd(r.bestPriceCents)}</span>{" "}
                  <span className="muted">best price</span>
                </>
              ) : (
                <span className="muted">Currently unavailable</span>
              )}
            </div>
            <div className="reasons">
              {r.reasons.map((reason) => (
                <span key={reason} className="reason">
                  {reason}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
