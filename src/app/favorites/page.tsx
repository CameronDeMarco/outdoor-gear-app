import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatUsd } from "@/lib/format";
import { FavoriteButton } from "@/components/FavoriteButton";

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="empty-state">
        <h1>Your favorites</h1>
        <p className="muted">
          <Link href="/login">Log in</Link> to save gear and see it here.
        </p>
      </div>
    );
  }

  // Favorites store a snapshot taken at save time, so this page renders with
  // zero external API calls — just one database read.
  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Your favorites</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {favorites.length} saved {favorites.length === 1 ? "item" : "items"}
      </p>

      {favorites.length === 0 ? (
        <p className="muted" style={{ marginTop: 20 }}>
          Nothing saved yet. Tap the ♡ on any product to add it here.
        </p>
      ) : (
        <div className="grid">
          {favorites.map((fav) => (
            <div key={fav.id} className="card-wrap">
              <FavoriteButton
                productId={fav.productId}
                name={fav.name}
                brand={fav.brand}
                imageUrl={fav.imageUrl}
                priceCents={fav.priceCents}
                initialFavorited
              />
              <Link href={`/product/${fav.productId}`} className="card">
                <div className="thumb">
                  {fav.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fav.imageUrl} alt={fav.name} loading="lazy" />
                  ) : (
                    <span className="thumb-fallback" aria-hidden="true">
                      🎒
                    </span>
                  )}
                </div>
                <div>
                  <h3>{fav.name}</h3>
                  {fav.brand && <div className="brand">{fav.brand}</div>}
                </div>
                <div>
                  <span className="price">{formatUsd(fav.priceCents)}</span>{" "}
                  <span className="muted">when saved</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
