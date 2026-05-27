/**
 * Single source of truth for book category labels, slugs and DB ids.
 *
 * The user-facing UI navigates by `slug` (e.g. `/categories/literature`)
 * because that's what the original hard-coded `data/books.js` seed used.
 * The book-service stores `category_id` as an INT. We map between them
 * here so the admin "Add Book" form, the categories landing page, and
 * the admin dashboard all stay aligned.
 */
export const BOOK_CATEGORIES = [
  { id: 1, slug: "literature", label: "Literature" },
  { id: 2, slug: "technology", label: "Technology" },
  { id: 3, slug: "business", label: "Business" },
  { id: 4, slug: "history", label: "History" },
  { id: 5, slug: "science", label: "Science" },
  { id: 6, slug: "arts", label: "Arts" },
];

export const CATEGORY_SLUGS = BOOK_CATEGORIES.map((c) => c.slug);

export const categoryBySlug = (slug) =>
  BOOK_CATEGORIES.find(
    (c) => c.slug.toLowerCase() === String(slug || "").toLowerCase()
  ) || null;

export const categoryById = (id) =>
  BOOK_CATEGORIES.find((c) => Number(c.id) === Number(id)) || null;

export const slugFromId = (id) => categoryById(id)?.slug || null;
export const idFromSlug = (slug) => categoryBySlug(slug)?.id || null;

export const labelForCategory = (idOrSlug) => {
  if (idOrSlug == null) return "—";
  const byId = categoryById(idOrSlug);
  if (byId) return byId.label;
  const bySlug = categoryBySlug(idOrSlug);
  if (bySlug) return bySlug.label;
  return String(idOrSlug);
};
