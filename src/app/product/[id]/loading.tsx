/**
 * Instant skeleton shown while the product detail page fetches live seller data.
 * Next.js renders this immediately on navigation, so clicking a product feels
 * responsive even though the immersive price call takes a moment to resolve.
 */
export default function Loading() {
  return (
    <>
      <div className="skeleton" style={{ width: 160, height: 14, marginBottom: 20 }} />

      <div className="detail-head">
        <div className="detail-photo">
          <span className="skeleton" style={{ width: "100%", height: "100%" }} />
        </div>
        <div
          className="detail-info"
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <span className="skeleton" style={{ width: 120, height: 12 }} />
          <span className="skeleton" style={{ width: "80%", height: 30 }} />
          <span className="skeleton" style={{ width: 200, height: 16 }} />
          <span className="skeleton" style={{ width: "100%", height: 14 }} />
          <span className="skeleton" style={{ width: "90%", height: 14 }} />
        </div>
      </div>

      <div className="skeleton" style={{ width: 140, height: 24, margin: "28px 0 16px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="skeleton" style={{ width: "100%", height: 34 }} />
        ))}
      </div>
    </>
  );
}
