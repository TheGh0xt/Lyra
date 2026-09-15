import type { InterestCategory } from "@/lib/api/client";

/** Mirrors Cygnus's `set_interests` validation exactly (UI_PRD §6.3). */
export const MIN_INTERESTS = 3;
export const MAX_INTERESTS = 5;

/** Toggles a category, silently refusing to grow past the max. */
export function toggleCategory(selected: string[], slug: string): string[] {
  if (selected.includes(slug)) {
    return selected.filter((s) => s !== slug);
  }
  if (selected.length >= MAX_INTERESTS) {
    return selected;
  }
  return [...selected, slug];
}

/**
 * The "skip" default: the first `MIN_INTERESTS` categories by sort order.
 *
 * Data-driven rather than a hardcoded slug list, so it stays valid however
 * Cygnus seeds or reorders the category table.
 */
export function defaultSelection(categories: InterestCategory[]): string[] {
  return [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, MIN_INTERESTS)
    .map((c) => c.slug);
}
