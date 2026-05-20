import { useCallback, useEffect, useState } from "react";
import {
  createBook,
  deleteBook,
  getBooks,
  updateBook,
} from "../services/api";
import API from "../services/api";

const asList = (data, nestedKey) => {
  if (Array.isArray(data)) return data;
  if (data && nestedKey && Array.isArray(data[nestedKey])) return data[nestedKey];
  return [];
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [error, setError] = useState(null);
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    categoryId: "1",
    totalCopies: "1",
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [usersRes, booksRes] = await Promise.all([
        API.get("/users"),
        getBooks(),
      ]);
      setUsers(asList(usersRes.data, "users"));
      setBooks(asList(booksRes.data, "books"));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateBook = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createBook({
        title: bookForm.title,
        author: bookForm.author,
        categoryId: Number(bookForm.categoryId),
        totalCopies: Number(bookForm.totalCopies),
      });
      setBookForm({
        title: "",
        author: "",
        categoryId: "1",
        totalCopies: "1",
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    setError(null);
    try {
      await deleteBook(id);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleUpdateCopies = async (book) => {
    const next = window.prompt(
      "Available copies:",
      String(book.availableCopies ?? book.available_copies ?? 0)
    );
    if (next === null) return;
    setError(null);
    try {
      await updateBook(book.id, { availableCopies: Number(next) });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f5efe9]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="mb-2 text-2xl font-bold text-[#D34F4E] sm:text-3xl">
          Admin Dashboard
        </h1>
        <p className="mb-6 text-sm text-gray-600 sm:mb-8">
          Manage users and books.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Users" value={users.length} />
          <StatCard label="Books" value={books.length} />
        </div>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Add book</h2>
          <form
            onSubmit={handleCreateBook}
            className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2"
          >
            <input
              required
              placeholder="Title"
              className="rounded-lg border px-3 py-2 text-sm"
              value={bookForm.title}
              onChange={(e) =>
                setBookForm((f) => ({ ...f, title: e.target.value }))
              }
            />
            <input
              required
              placeholder="Author"
              className="rounded-lg border px-3 py-2 text-sm"
              value={bookForm.author}
              onChange={(e) =>
                setBookForm((f) => ({ ...f, author: e.target.value }))
              }
            />
            <input
              required
              type="number"
              min="1"
              placeholder="Category ID"
              className="rounded-lg border px-3 py-2 text-sm"
              value={bookForm.categoryId}
              onChange={(e) =>
                setBookForm((f) => ({ ...f, categoryId: e.target.value }))
              }
            />
            <input
              required
              type="number"
              min="1"
              placeholder="Total copies"
              className="rounded-lg border px-3 py-2 text-sm"
              value={bookForm.totalCopies}
              onChange={(e) =>
                setBookForm((f) => ({ ...f, totalCopies: e.target.value }))
              }
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#D34F4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c04544] disabled:opacity-60 sm:col-span-2"
            >
              {saving ? "Saving…" : "Create book"}
            </button>
          </form>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Books</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-700">
                <tr>
                  <th className="px-3 py-3 sm:px-4">Title</th>
                  <th className="hidden px-3 py-3 sm:table-cell sm:px-4">
                    Author
                  </th>
                  <th className="px-3 py-3 sm:px-4">Available</th>
                  <th className="px-3 py-3 sm:px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {books.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/80">
                    <td className="max-w-[140px] break-words px-3 py-3 font-medium sm:max-w-none sm:px-4">
                      {b.title}
                    </td>
                    <td className="hidden px-3 py-3 text-gray-600 sm:table-cell sm:px-4">
                      {b.author}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      {b.availableCopies ?? b.available_copies}
                    </td>
                    <td className="space-x-2 whitespace-nowrap px-3 py-3 sm:px-4">
                      <button
                        type="button"
                        onClick={() => handleUpdateCopies(b)}
                        className="text-xs font-medium text-[#D34F4E] hover:underline"
                      >
                        Edit copies
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBook(b.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {books.length === 0 && !error && (
              <p className="p-6 text-center text-sm text-gray-500">
                No books loaded.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Users</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-700">
                <tr>
                  <th className="px-3 py-3 sm:px-4">User</th>
                  <th className="hidden px-3 py-3 sm:table-cell sm:px-4">
                    Email
                  </th>
                  <th className="px-3 py-3 sm:px-4">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80">
                    <td className="max-w-[140px] break-words px-3 py-3 font-medium text-gray-900 sm:max-w-none sm:px-4">
                      {u.username}
                      <div className="mt-0.5 text-xs font-normal text-gray-500 sm:hidden">
                        {u.email}
                      </div>
                    </td>
                    <td className="hidden break-all px-3 py-3 text-gray-600 sm:table-cell sm:px-4">
                      {u.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-700 sm:px-4">
                      {u.role}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && !error && (
              <p className="p-6 text-center text-sm text-gray-500">
                No users loaded.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-[#D34F4E]">{value}</p>
    </div>
  );
}

export default AdminDashboard;
