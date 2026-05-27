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
} from "./layout/BookCardStyles";

/**
 * Build the "Popular Now" list by merging:
 *   1. Admin-curated DB picks (`is_popular = true`) — source of truth.
 *   2. Seed `featured` books — fallback shown on a fresh DB / when no
 *      admin has curated yet, so the homepage is never empty.
 *
 * DB entries always win on id collision.
 */
function buildPopularList(apiBooks) {
  const byId = new Map();

  // Start with seeded featured books so non-admin/unauthenticated
  // visitors still see content before anyone has flagged anything.
  for (const b of seedBooks) {
    if (!b.featured) continue;
    byId.set(String(b.id), {
      id: b.id,
      title: b.title,
      author: b.author,
      image: b.image,
      source: "seed",
    });
  }

  for (const b of apiBooks) {
    if (!b.isPopular) {
      // Drop seeded fallback if the admin has explicitly unflagged it.
      // (Same id in DB with is_popular=false should hide it.)
      // Only remove if we know the DB record exists — otherwise leave seed.
      byId.delete(String(b.id));
      continue;
    }
    byId.set(String(b.id), {
      id: b.id,
      title: b.title || "",
      author: b.author || "",
      image: b.image || "",
      source: "api",
    });
  }

  return [...byId.values()];
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
                  src={book.image}
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
                    {b.image ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <img
                        src={b.image}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
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
