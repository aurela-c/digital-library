import { useParams, Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FiEdit2, FiTrash2, FiPlus, FiX } from "react-icons/fi";
import { books as seedBooks } from "../data/books";
import HomeNavbar from "../components/HomeNavbar";
import Footer from "../components/Footer";
import PageContainer from "../components/layout/PageContainer";
import {
  bookTileCard,
  bookTileImage,
  bookTileTitle,
  bookTileAuthor,
} from "../components/layout/BookCardStyles";
import { createBook, deleteBook, getBooks, updateBook } from "../services/api";
import { useIsAdmin } from "../utils/roles.js";
import {
  BOOK_CATEGORIES,
  categoryBySlug,
  idFromSlug,
} from "../utils/categories.js";

/**
 * Merge static seed books with DB-backed books. DB entries win on id
 * collision (admins editing a seeded title should see their edits). Each
 * record is normalised to a shape both views can rely on.
 */
function mergeCatalog(api, seed, slug) {
  const slugLc = String(slug || "").toLowerCase();
  const slugId = idFromSlug(slugLc);
  const byId = new Map();

  // 1) Seed records that belong to this category by name
  for (const b of seed) {
    if (String(b.category || "").toLowerCase() !== slugLc) continue;
    byId.set(String(b.id), {
      id: b.id,
      title: b.title,
      author: b.author,
      image: b.image,
      description: b.description || "",
      categoryId: slugId,
      categorySlug: slugLc,
      totalCopies: null,
      availableCopies: null,
      source: "seed",
    });
  }

  // 2) DB records filtered to this category
  for (const b of api) {
    const apiCatId = Number(b.categoryId ?? b.category_id);
    if (slugId != null && Number.isFinite(apiCatId) && apiCatId !== slugId) {
      continue;
    }
    // If the DB record has no category_id, allow it through only if its
    // id matches an existing seeded record in this slug (legacy data).
    if (
      (slugId == null || !Number.isFinite(apiCatId)) &&
      !byId.has(String(b.id))
    ) {
      continue;
    }
    byId.set(String(b.id), {
      id: b.id,
      title: b.title || "",
      author: b.author || "",
      image: b.image || byId.get(String(b.id))?.image || "",
      description:
        b.description || byId.get(String(b.id))?.description || "",
      categoryId: apiCatId || slugId,
      categorySlug: slugLc,
      totalCopies: Number(b.totalCopies ?? b.total_copies) || null,
      availableCopies:
        Number(b.availableCopies ?? b.available_copies) || null,
      source: "api",
    });
  }

  return [...byId.values()];
}

export default function CategoryBooks() {
  const { category } = useParams();
  const location = useLocation();
  const isAdmin = useIsAdmin();

  const slug = String(category || "").toLowerCase();
  const meta = categoryBySlug(slug);

  const [apiBooks, setApiBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState(null); // { mode: "create" | "edit", book? }
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const loadBooks = useCallback(async () => {
    if (!localStorage.getItem("accessToken")) {
      // Unauthenticated browsers can still see the seeded catalog.
      return;
    }
    setLoading(true);
    try {
      const res = await getBooks();
      setApiBooks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn("Could not load books from API:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const filteredBooks = useMemo(
    () => mergeCatalog(apiBooks, seedBooks, slug),
    [apiBooks, slug]
  );

  const professorPicks = { literature: 3 };
  const professorBook = filteredBooks.find(
    (book) => book.id === professorPicks[slug]
  );

  const handleSave = async (form, mode) => {
    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      image: form.image.trim() || null,
      description: form.description.trim() || null,
      categoryId: Number(form.categoryId),
      totalCopies: Number(form.totalCopies),
    };
    if (form.availableCopies !== "") {
      payload.availableCopies = Number(form.availableCopies);
    }
    if (!payload.title || !payload.author) {
      throw new Error("Title and author are required");
    }
    if (!Number.isFinite(payload.categoryId)) {
      throw new Error("Pick a valid category");
    }
    if (!Number.isFinite(payload.totalCopies) || payload.totalCopies < 1) {
      throw new Error("Total copies must be at least 1");
    }

    if (mode === "create") {
      await createBook(payload);
      toast.success("Book added to catalog");
    } else {
      await updateBook(editor.book.id, payload);
      toast.success("Book updated");
    }
    setEditor(null);
    await loadBooks();
  };

  const handleDelete = async (book) => {
    try {
      await deleteBook(book.id);
      toast.success(`Removed "${book.title}"`);
      setConfirmDelete(null);
      await loadBooks();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Could not delete this book"
      );
    }
  };

  return (
    <>
      <div className="relative z-50">
        <HomeNavbar />
      </div>

      <div className="relative min-h-[200px] sm:min-h-[260px] md:h-[320px] flex items-center justify-center z-0">
        <img
          src={`/images/categories/${slug}.png`}
          alt=""
          className="absolute w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 backdrop-blur-md bg-white/10 border border-white/20 shadow-xl rounded-xl sm:rounded-2xl px-4 py-6 sm:px-8 sm:py-8 md:px-12 text-center mx-4 max-w-2xl w-full">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white capitalize break-words">
            {meta?.label || slug} Books
          </h1>

          <p className="text-gray-200 mt-2 sm:mt-3 text-sm sm:text-base max-w-lg mx-auto">
            Explore a collection of books available in {meta?.label || slug}{" "}
            and find titles that match your interests.
          </p>
        </div>
      </div>

      <div className="bg-[#f5efe9] py-8 sm:py-10 relative z-10">
        <PageContainer>
          {professorBook && (
            <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 p-5 sm:p-8 rounded-2xl overflow-hidden shadow-xl mb-8 sm:mb-12">
              <div
                className="absolute inset-0 bg-cover bg-center blur-md scale-110"
                style={{ backgroundImage: `url(${professorBook.image})` }}
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 items-center text-center sm:text-left">
                <Link
                  to={`/book/${professorBook.id}`}
                  className="shrink-0 w-36 sm:w-40 self-center sm:self-start"
                >
                  <img
                    src={professorBook.image}
                    alt=""
                    className="w-full aspect-[2/3] object-cover rounded-lg shadow-lg hover:scale-105 transition"
                  />
                </Link>
                <div className="text-white min-w-0 flex-1">
                  <h2 className="text-xs uppercase tracking-widest text-gray-200 mb-2">
                    Professor&apos;s Pick
                  </h2>
                  <h3 className="text-xl sm:text-2xl font-bold mb-2 line-clamp-2">
                    {professorBook.title}
                  </h3>
                  <p className="text-gray-200 font-medium mb-2 text-sm sm:text-base">
                    {professorBook.author}
                  </p>
                  <p className="text-gray-300 text-xs sm:text-sm line-clamp-4 sm:line-clamp-6">
                    {professorBook.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold capitalize">
              All {meta?.label || slug} Books
            </h2>
            {isAdmin && (
              <button
                type="button"
                onClick={() =>
                  setEditor({
                    mode: "create",
                    book: { categoryId: meta?.id ?? "" },
                  })
                }
                className="inline-flex items-center gap-2 rounded-full bg-[#D34F4E] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c04544] sm:text-sm"
              >
                <FiPlus className="text-sm" />
                Add new book
              </button>
            )}
          </div>

          {loading && filteredBooks.length === 0 && (
            <p className="text-sm text-gray-500">Loading catalog…</p>
          )}

          {!loading && filteredBooks.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-gray-600">
                There are no books in this category yet.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    setEditor({
                      mode: "create",
                      book: { categoryId: meta?.id ?? "" },
                    })
                  }
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#D34F4E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c04544]"
                >
                  <FiPlus className="text-sm" />
                  Add the first one
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
            {filteredBooks.map((book) => (
              <div key={book.id} className={`${bookTileCard} relative group`}>
                <Link to={`/book/${book.id}`} className="block min-w-0">
                  <img
                    src={book.image}
                    alt=""
                    className={bookTileImage}
                  />
                  <h3 className={bookTileTitle}>{book.title}</h3>
                  <p className={bookTileAuthor}>{book.author}</p>
                </Link>

                {isAdmin && (
                  <div className="mt-2 flex items-center justify-end gap-1.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEditor({ mode: "edit", book })}
                      title="Edit book"
                      className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100 sm:text-[11px]"
                    >
                      <FiEdit2 />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(book)}
                      title="Delete book"
                      className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 sm:text-[11px]"
                    >
                      <FiTrash2 />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </PageContainer>
      </div>

      <Footer />

      {editor && (
        <BookEditorModal
          mode={editor.mode}
          book={editor.book}
          defaultCategoryId={meta?.id ?? null}
          onCancel={() => setEditor(null)}
          onSave={(form) => handleSave(form, editor.mode)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Remove book"
          message={`Permanently delete "${confirmDelete.title}" from the catalog? This cannot be undone.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </>
  );
}

// ============================================================
// Inline modals — kept in-file to avoid extra shared components.
// ============================================================
function BookEditorModal({
  mode,
  book,
  defaultCategoryId,
  onCancel,
  onSave,
}) {
  const [form, setForm] = useState(() => ({
    title: book?.title || "",
    author: book?.author || "",
    image: book?.image || "",
    description: book?.description || "",
    categoryId: String(
      book?.categoryId ?? defaultCategoryId ?? BOOK_CATEGORIES[0]?.id ?? 1
    ),
    totalCopies: String(book?.totalCopies ?? 1),
    availableCopies:
      book?.availableCopies != null ? String(book.availableCopies) : "",
  }));
  const [busy, setBusy] = useState(false);

  const setField = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(form);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Save failed"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {mode === "create" ? "Add a book" : `Edit "${book?.title || ""}"`}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Title" required>
              <input
                required
                maxLength={255}
                value={form.title}
                onChange={setField("title")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Author" required>
              <input
                required
                maxLength={255}
                value={form.author}
                onChange={setField("author")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Category" required>
              <select
                value={form.categoryId}
                onChange={setField("categoryId")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {BOOK_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Cover image"
              hint="Accepts a relative path like /images/book.jpg, a full https URL, or leave blank."
            >
              <input
                // Use plain text — `type=url` rejects relative paths like
                // /images/book.jpg via HTML5 validation, which silently
                // prevented the form from submitting at all.
                type="text"
                maxLength={512}
                placeholder="/images/book.jpg or https://…"
                value={form.image}
                onChange={setField("image")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Total copies" required>
              <input
                type="number"
                min="1"
                required
                value={form.totalCopies}
                onChange={setField("totalCopies")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field
              label="Available copies"
              hint={
                mode === "create"
                  ? "Leave blank to default to total copies."
                  : "Leave blank to keep current value."
              }
            >
              <input
                type="number"
                min="0"
                value={form.availableCopies}
                onChange={setField("availableCopies")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              rows={4}
              maxLength={5000}
              value={form.description}
              onChange={setField("description")}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </Field>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#D34F4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c04544] disabled:opacity-60"
            >
              {busy
                ? "Saving…"
                : mode === "create"
                ? "Add to catalog"
                : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </label>
  );
}

function ConfirmDialog({ title, message, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
