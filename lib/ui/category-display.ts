/**
 * A decorative glyph per onboarding category (UI_PRD §6.3: "icon or
 * illustrative treatment per category, not a plain checkbox list").
 *
 * Cygnus serves categories from its own table — see `routes.py`'s comment
 * that the list has one source of truth — so slugs it adds later fall
 * through to a generic mark rather than breaking the picker.
 */
const CATEGORY_GLYPH: Record<string, string> = {
  politics: "◆",
  elections: "☐",
  geopolitics: "◈",
  economics: "▲",
  crypto: "◎",
  "business-earnings": "▣",
  technology: "◫",
  ai: "✦",
  sports: "●",
  entertainment: "◐",
  science: "✳",
  climate: "❊",
  health: "✚",
};

export function categoryGlyph(slug: string): string {
  return CATEGORY_GLYPH[slug] ?? "◇";
}
