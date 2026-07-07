import { Suspense } from "react";
import Link from "next/link";
import { getDataSource } from "@/data";
import { recommend } from "@/domain/recommend";
import type { GearCategory } from "@/domain/types";
import { formatUsd, formatRating } from "@/lib/format";
import { ALL_CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABELS, starGlyphs } from "@/lib/ui";

function isCategory(value: string | undefined): value is GearCategory {
  return !!value && (ALL_CATEGORIES as string[]).includes(value);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const query = (q ?? "").trim();
  const active = isCategory(category) ? category : undefined;

  return (
    <>
      <form className="search" action="/" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search any gear — e.g. running shoes, trekking poles"
          aria-label="Search products"
        />
        <button type="submit">Search</button>
      </form>

      {query ? (
        <div className="search-status">
          <span>
            Showing results for <strong>“{query}”</strong>
          </span>
          <Link href="/" className="clear">
            ← Back to categories
          </Link>
        </div>
      ) : (
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
      )}

      {/*
        The results grid is the slow part (it awaits live data). Streaming it in a
        Suspense boundary lets the search box + filters render instantly. The key
        makes the skeleton re-appear on every new search or category change, so
        navigation always feels responsive.
      */}
      <Suspense key={query || active || "all"} fallback={<GridSkeleton />}>
        <Results query={query} active={active} />
      </Suspense>
    </>
  );
}

async function Results({ query, active }: { query: string; active?: GearCategory }) {
  const source = getDataSource();
  // Free-text search overrides category browsing when present.
  const products = query
    ? await source.searchProducts(query)
    : await source.listProducts();
  const results = recommend(products, {
    category: query ? undefined : active,
    limit: 24,
  });

  if (results.length === 0) {
    return (
      <p className="muted" style={{ marginTop: 20 }}>
        {query
          ? `No products matched “${query}”. Try different keywords.`
          : "No products found."}
      </p>
    );
  }

  return (
    <div className="grid">
      {results.map((r, i) => (
        <Link key={r.product.id} href={`/product/${r.product.id}`} className="card">
          <div className="thumb">
            {r.product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.product.imageUrl} alt={r.product.name} loading="lazy" />
            ) : (
              <span className="thumb-fallback" aria-hidden="true">
                {CATEGORY_EMOJI[r.product.category]}
              </span>
            )}
          </div>
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
  );
}

/** Skeleton grid shown while recommendations load. */
function GridSkeleton() {
  return (
    <div className="grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card">
          <div className="thumb">
            <span className="skeleton" style={{ width: "100%", height: "100%" }} />
          </div>
          <span className="skeleton" style={{ width: 90, height: 11 }} />
          <span className="skeleton" style={{ width: "75%", height: 17 }} />
          <span className="skeleton" style={{ width: 140, height: 14 }} />
          <span className="skeleton" style={{ width: 110, height: 20 }} />
          <span className="skeleton" style={{ width: "60%", height: 20, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}
