/** Shared Tailwind classes for book tiles in grids (PopularNow, CategoryBooks, etc.) */
export const bookTileCard =
  "bg-white shadow-md rounded-lg overflow-hidden p-2 sm:p-3 hover:shadow-lg transition flex flex-col h-full min-w-0";

export const bookTileImage =
  "w-full aspect-[3/4] object-cover rounded-md hover:scale-[1.02] transition";

export const bookTileTitle = "mt-2 font-semibold text-xs sm:text-sm line-clamp-2";

export const bookTileAuthor = "text-gray-500 text-[10px] sm:text-xs line-clamp-1";

export const bookBorrowBtn =
  "mt-auto w-full sm:w-auto text-center bg-[#D34F4E] text-white text-xs sm:text-sm font-medium px-3 sm:px-6 py-2 rounded-md hover:bg-black transition cursor-pointer shrink-0";

/**
 * Fallback cover used when an admin enters an image path that doesn't
 * resolve at runtime (typo, missing file in /public/images/, broken
 * remote URL, etc.). Without this fallback the browser renders a tiny
 * broken-image icon and the catalog looks visibly broken.
 *
 * Use via the `coverImgProps` helper below instead of touching the
 * `onError` handler manually in every consumer.
 */
export const BOOK_COVER_FALLBACK = "/images/book1.jpg";

/**
 * Spread these props onto an <img> that renders a book cover to get:
 *   - a safe `src` (falls back to `BOOK_COVER_FALLBACK` when src is empty)
 *   - an `onError` handler that swaps to the fallback when the resource
 *     fails to load
 *   - a `loading="lazy"` hint
 *
 * The handler intentionally clears `onerror` after swapping so a broken
 * fallback URL can't cause an infinite re-trigger loop.
 */
export const coverImgProps = (src) => ({
  src: src && String(src).trim() ? src : BOOK_COVER_FALLBACK,
  loading: "lazy",
  onError: (e) => {
    const el = e?.currentTarget;
    if (!el || el.dataset.fallbackApplied === "1") return;
    el.dataset.fallbackApplied = "1";
    el.src = BOOK_COVER_FALLBACK;
  },
});
