import type { GearCategory } from "@/domain/types";

export const CATEGORY_LABELS: Record<GearCategory, string> = {
  tents: "Tents",
  "sleeping-bags": "Sleeping Bags",
  backpacks: "Backpacks",
  "hiking-boots": "Hiking Boots",
  jackets: "Jackets",
  stoves: "Stoves",
  "water-filters": "Water Filters",
  headlamps: "Headlamps",
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as GearCategory[];

/** Emoji shown as a placeholder when a product has no image. */
export const CATEGORY_EMOJI: Record<GearCategory, string> = {
  tents: "⛺",
  "sleeping-bags": "🛌",
  backpacks: "🎒",
  "hiking-boots": "🥾",
  jackets: "🧥",
  stoves: "🔥",
  "water-filters": "💧",
  headlamps: "🔦",
};

/** Render a 0–5 rating as filled/empty star glyphs. */
export function starGlyphs(rating: number): string {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}
