"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  priceCents: number;
  initialFavorited: boolean;
  /** "icon" = small heart for cards; "full" = labelled button for the detail page. */
  variant?: "icon" | "full";
}

/**
 * A heart toggle that saves/removes a favorite via the API.
 * Uses optimistic UI: flip the state immediately, then reconcile with the server
 * (revert on failure). If the user isn't logged in the API returns 401 and we
 * send them to the login page.
 */
export function FavoriteButton({
  productId,
  name,
  brand,
  imageUrl,
  priceCents,
  initialFavorited,
  variant = "icon",
}: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    // Cards are wrapped in a link — don't navigate when the heart is clicked.
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const next = !favorited;
    setFavorited(next); // optimistic
    setPending(true);
    try {
      const res = await fetch("/api/favorites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          next ? { productId, name, brand, imageUrl, priceCents } : { productId },
        ),
      });
      if (res.status === 401) {
        setFavorited(!next); // revert
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Request failed");
      router.refresh(); // keep server components (e.g. the favorites page) in sync
    } catch {
      setFavorited(!next); // revert on error
    } finally {
      setPending(false);
    }
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={favorited}
        className={`btn ${favorited ? "amber" : "secondary"}`}
      >
        {favorited ? "♥ Saved to favorites" : "♡ Save to favorites"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className={`fav-heart ${favorited ? "on" : ""}`}
    >
      {favorited ? "♥" : "♡"}
    </button>
  );
}
