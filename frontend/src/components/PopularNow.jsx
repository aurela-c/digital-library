import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiStar } from "react-icons/fi";
import { books as seedBooks } from "../data/books";
import API, { getBooks, setBookPopular } from "../services/api";
import { useIsAdmin } from "../utils/roles.js";
import PageContainer from "./layout/PageContainer";
import {
  bookTileCard,
  bookTileImage,
  bookTileTitle,
  bookTileAuthor,
  bookBorrowBtn,
  coverImgProps,
} from "./layout/BookCardStyles";

/**
 * Build the "Popular Now" list.
 *
 * The list is STRICTLY DB-driven once any book has been flagged as
 * popular by an admin. The previous behaviour merged seeded `featured`
 * books with DB rows, which had two bad consequences:
 *
 *   1. A seeded book with no DB row (the common case on a fresh DB)
 *      could never be removed — clicking "Remove from Popular" would
 *      PATCH /books/<seed_id> and 404, leaving the seed row visible
 *      forever. That looked exactly like "popular books logic is stuck"
 *      in the issue report.
 *   2. Admin-added popular books were rendered alongside seeded ones,
 *      so the carousel didn't reflect the real curated state.
 *
 * New rules:
 *   - If the DB has at least one book with `is_popular = true`, render
 *     ONLY those. This makes the carousel a faithful mirror of what
 *     admins actually picked.
 *   - If the DB has zero popular books (or the API failed and we got an
 *     empty array), fall back to the seeded `featured` books so a fresh
 *     install / signed-out visitor still sees content. As soon as an
 *     admin marks any book popular, the seeded fallback disappears.
 */
function buildPopularList(apiBooks) {
  const dbPopular = apiBooks
    .filter((b) => Boolean(b.isPopular))
    .map((b) => ({
      id: b.id,
      title: b.title || "",
      author: b.author || "",
      image: b.image || "",
      source: "api",
    }));

  if (dbPopular.length > 0) return dbPopular;

  return seedBooks
    .filter((b) => b.featured)
    .map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      image: b.image,
      source: "seed",
    }));
}

function PopularNow() {
  const isAdmin = useIsAdmin();
  const [apiBooks, setApiBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState(false);

  const loadBooks = useCallback(async () => {
    if (!localStorage.getItem("accessToken")) return;
    setLoading(true);
    try {
      const res = await getBooks();
      setApiBooks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn("PopularNow load failed:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const popular = buildPopularList(apiBooks).slice(0, 5);

  const handleBorrow = async (book) => {
    if (isAdmin) {
      toast.info("Admins manage the library and don't borrow books.");
      return;
    }
    try {
      await API.post("/borrow", { bookId: String(book.id) });
      toast.success(`You borrowed "${book.title}"!`);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to borrow book.";
      toast.error(msg);
    }
  };

  const togglePopular = async (book, next) => {
    // Guard: seeded fallback books are NOT in the DB. They appear only
    // while the catalog has zero admin-curated popular books. There is
    // nothing to PATCH for them, so we explain instead of 404'ing.
    if (book.source === "seed") {
      toast.info(
        "This is a default fallback book. Use 'Manage Popular Now' to add a real catalog book — the fallback will disappear automatically."
      );
      return;
    }
    try {
      await setBookPopular(book.id, next);
      toast.success(
        next
          ? `Added "${book.title}" to Popular Now`
          : `Removed "${book.title}" from Popular Now`
      );
      await loadBooks();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Could not update Popular Now"
      );
    }
  };

  // Books admins can pick FROM (everything not already popular).
  const pickable = apiBooks.filter((b) => !b.isPopular);

  return (
    <section id="popular-now" className="mt-8 sm:mt-10">
      <PageContainer>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-[#D34F4E]">
            Popular Now
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setPicker((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full bg-[#D34F4E] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c04544] sm:text-sm"
            >
              <FiStar className="text-sm" />
              {picker ? "Done" : "Manage Popular Now"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {popular.map((book) => (
            <div key={book.id} className={`${bookTileCard} relative`}>
              <Link to={`/book/${book.id}`} className="block min-w-0">
                <img
                  {...coverImgProps(book.image)}
                  alt={book.title}
                  className={bookTileImage}
                />
                <h3 className={bookTileTitle}>{book.title}</h3>
                <p className={bookTileAuthor}>{book.author}</p>
              </Link>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => togglePopular(book, false)}
                  className="mt-auto w-full rounded-md bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 sm:text-sm"
                >
                  Remove from Popular
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBorrow(book)}
                  className={bookBorrowBtn}
                >
                  Borrow
                </button>
              )}
            </div>
          ))}
        </div>

        {isAdmin && picker && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">
              Add a book to Popular Now
            </h3>
            {loading && (
              <p className="text-xs text-gray-500">Loading catalog…</p>
            )}
            {!loading && pickable.length === 0 && (
              <p className="text-xs text-gray-500">
                Every catalog book is already flagged as popular.
              </p>
            )}
            <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {pickable.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => togglePopular(b, true)}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-left text-xs transition hover:border-[#D34F4E]/30 hover:bg-[#D34F4E]/5 sm:text-sm"
                >
                  <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-gray-100">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <img
                      {...coverImgProps(b.image)}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800">
                      {b.title}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      {b.author}
                    </p>
                  </div>
                  <FiStar className="ml-auto text-[#D34F4E]" />
                </button>
              ))}
            </div>
          </div>
        )}
      </PageContainer>
    </section>
  );
}

export default PopularNow;
