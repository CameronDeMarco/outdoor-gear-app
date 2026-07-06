import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataSource } from "@/data";
import { scanPrices } from "@/domain/prices";
import { scoreProduct } from "@/domain/recommend";
import { formatUsd, formatRating } from "@/lib/format";
import { CATEGORY_LABELS, starGlyphs } from "@/lib/ui";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = getDataSource();
  const product = await source.getProduct(id);
  if (!product) notFound();

  const retailers = await source.listRetailers();
  const retailerName = (rid: string) => retailers.find((r) => r.id === rid)?.name ?? rid;

  const scan = scanPrices(product);
  const scored = scoreProduct(product);

  return (
    <>
      <Link href="/" className="back">
        ← All recommendations
      </Link>

      <p className="muted">
        {CATEGORY_LABELS[product.category]} · {product.brand}
      </p>
      <h1 style={{ margin: "0 0 8px" }}>{product.name}</h1>

      <div className="rating">
        <span className="stars">{starGlyphs(scored.bayesianRating)}</span>
        {formatRating(scored.bayesianRating)}
        <span className="muted">
          adjusted rating · {scored.totalReviews.toLocaleString()} reviews
        </span>
      </div>

      <p style={{ maxWidth: 640 }}>{product.description}</p>

      <ul className="spec-list">
        {Object.entries(product.specs).map(([k, v]) => (
          <li key={k}>
            <span className="k">{k}</span>
            {v}
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 28 }}>Price scan</h2>
      {scan.best ? (
        <p>
          <span className="price">{formatUsd(scan.best.totalCents)}</span> at{" "}
          <strong>{retailerName(scan.best.retailerId)}</strong>
          {scan.savingsVsHighestCents > 0 && (
            <span className="savings">
              {" "}
              — save {formatUsd(scan.savingsVsHighestCents)} vs. the priciest seller
            </span>
          )}
        </p>
      ) : (
        <p className="muted">No in-stock offers right now.</p>
      )}

      <table className="offers">
        <thead>
          <tr>
            <th>Retailer</th>
            <th>Item</th>
            <th>Shipping</th>
            <th>Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {scan.ranked.map((o) => {
            const isBest = scan.best?.retailerId === o.retailerId && o.inStock;
            return (
              <tr key={o.retailerId} className={isBest ? "best" : ""}>
                <td>{retailerName(o.retailerId)}</td>
                <td>{formatUsd(o.priceCents)}</td>
                <td>{o.shippingCents === 0 ? "Free" : formatUsd(o.shippingCents)}</td>
                <td>{formatUsd(o.totalCents)}</td>
                <td>
                  {!o.inStock ? (
                    <span className="tag-oos">Out of stock</span>
                  ) : o.url ? (
                    <a
                      className={`btn ${isBest ? "amber" : "secondary"} small`}
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {isBest ? "Buy ★" : "Buy"}
                    </a>
                  ) : isBest ? (
                    <span className="tag-best">BEST</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {scan.best && (
        <p style={{ marginTop: 20 }}>
          <a
            className="btn amber"
            href={scan.best.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Buy at {retailerName(scan.best.retailerId)} →
          </a>
        </p>
      )}

      <h3 style={{ marginTop: 28 }}>Reviews by source</h3>
      <table className="offers">
        <thead>
          <tr>
            <th>Source</th>
            <th>Rating</th>
            <th>Reviews</th>
          </tr>
        </thead>
        <tbody>
          {product.reviews.map((rv) => (
            <tr key={rv.source}>
              <td>{rv.source}</td>
              <td>
                <span className="stars">{starGlyphs(rv.averageRating)}</span>{" "}
                {formatRating(rv.averageRating)}
              </td>
              <td>{rv.reviewCount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
