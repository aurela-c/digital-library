import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiUsers,
  FiBook,
  FiGrid,
  FiMenu,
  FiX,
  FiLifeBuoy,
  FiSend,
  FiRefreshCw,
  FiTrash2,
  FiEdit2,
  FiPlus,
  FiStar,
} from "react-icons/fi";
import {
  createBook,
  deleteBook,
  deleteUser,
  getAdminStats,
  getAllUsers,
  getBooks,
  getSupportTicket,
  getSupportTickets,
  replySupportTicket,
  setBookPopular,
  updateBook,
  updateSupportTicketPriority,
  updateSupportTicketStatus,
  updateUserRole,
  updateUserStatus,
} from "../services/api";
import { AuthContext } from "../../context/AuthContext.jsx";
import {
  BOOK_CATEGORIES,
  categoryById,
  labelForCategory,
} from "../utils/categories.js";
import { coverImgProps } from "../components/layout/BookCardStyles.js";
import LogoutButton from "../components/LogoutButton.jsx";

const asList = (data, nestedKey) => {
  if (Array.isArray(data)) return data;
  if (data && nestedKey && Array.isArray(data[nestedKey])) return data[nestedKey];
  return [];
};

const ROLE_OPTIONS = [
  { value: "ROLE_USER", label: "User" },
  { value: "ROLE_LIBRARIAN", label: "Librarian" },
  { value: "ROLE_ADMIN", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "BANNED", label: "Banned" },
];

const STATUS_STYLE = {
  ACTIVE: "bg-green-100 text-green-700 ring-1 ring-green-200",
  INACTIVE: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  BANNED: "bg-red-100 text-red-700 ring-1 ring-red-200",
};

/**
 * Admin Tools Panel sections.
 *
 * This dashboard replaces the user profile entirely for admins. The
 * full set of admin-only capabilities lives here: cross-account stats,
 * user management, book CRUD with category grouping, and the support
 * inbox. The same book CRUD is ALSO available inline on the public
 * category pages — admins can use whichever workflow they prefer.
 */
const SECTIONS = [
  { id: "overview", label: "Overview", icon: FiGrid },
  { id: "users", label: "Users", icon: FiUsers },
  { id: "books", label: "Books", icon: FiBook },
  { id: "support", label: "Support", icon: FiLifeBuoy },
];

const TICKET_STATUS_STYLE = {
  open: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  pending: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  resolved: "bg-green-100 text-green-700 ring-1 ring-green-200",
  closed: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};

const TICKET_STATUS_OPTIONS = ["open", "pending", "resolved", "closed"];
const TICKET_PRIORITY_OPTIONS = ["low", "normal", "high"];
const TICKET_CATEGORY_OPTIONS = ["technical", "account", "book", "general"];

const fmtDateTime = (v) => {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
};

const AdminDashboard = () => {
  // We deliberately only consume `user` here — the actual logout flow
  // (confirm dialog + navigate to /login) lives inside LogoutButton so
  // every entry point in the app behaves identically.
  const { user: currentUser } = useContext(AuthContext);
  const [section, setSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState({
    users: false,
    books: false,
    stats: false,
  });
  const [error, setError] = useState(null);

  const loadUsers = useCallback(async (params = {}) => {
    setLoading((s) => ({ ...s, users: true }));
    try {
      const res = await getAllUsers(params);
      const list = asList(res.data, "users");
      // Surface the role / accountStatus distribution in DevTools so
      // future schema drift (e.g. the ENUM-vs-VARCHAR bug we fixed in
      // the user-service migration) is spotted on the very first load
      // instead of after the admin reports broken UI.
      if (list.length > 0) {
        const roles = list.reduce((acc, u) => {
          const k = String(u.role || "<empty>");
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {});
        const statuses = list.reduce((acc, u) => {
          const k = String(u.accountStatus || "<empty>").toUpperCase();
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {});
        console.debug(
          "[admin] users loaded",
          { total: list.length, roles, statuses }
        );
        // Loud warning if the DB columns still contain pre-migration
        // truncated values — proves whether the user-service migration
        // ran. Empty string == ENUM rejected the canonical write.
        if (roles[""] || roles["<empty>"]) {
          console.warn(
            "[admin] some users have an empty `role` field — run the user-service migration"
          );
        }
        if (statuses[""] || statuses["<empty>"]) {
          console.warn(
            "[admin] some users have an empty `accountStatus` field — run the user-service migration"
          );
        }
      }
      setUsers(list);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(msg);
      toast.error(`Could not load users: ${msg}`);
    } finally {
      setLoading((s) => ({ ...s, users: false }));
    }
  }, []);

  const loadBooks = useCallback(async () => {
    setLoading((s) => ({ ...s, books: true }));
    try {
      const res = await getBooks();
      setBooks(asList(res.data, "books"));
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(msg);
    } finally {
      setLoading((s) => ({ ...s, books: false }));
    }
  }, []);

  const loadStats = useCallback(async () => {
    setLoading((s) => ({ ...s, stats: true }));
    try {
      const res = await getAdminStats();
      setStats(res.data?.stats || null);
    } catch (err) {
      // Stats are best-effort — fall back to derived numbers.
      console.warn(
        "[admin] stats endpoint failed, falling back to client aggregation:",
        err.response?.data?.message || err.message
      );
      setStats(null);
    } finally {
      setLoading((s) => ({ ...s, stats: false }));
    }
  }, []);

  useEffect(() => {
    setError(null);
    loadUsers();
    loadBooks();
    loadStats();
  }, [loadUsers, loadBooks, loadStats]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f5efe9] text-gray-800">
      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <FiMenu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-[#D34F4E]">Admin</span>
        </div>
        <Link to="/home" className="text-xs font-medium text-gray-500 hover:text-[#D34F4E]">
          Back to app
        </Link>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <Sidebar
          section={section}
          setSection={setSection}
          currentUser={currentUser}
          mobileOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        {/* Main */}
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <PageHeader section={section} />

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {section === "overview" && (
            <OverviewSection
              users={users}
              books={books}
              stats={stats}
              loading={loading}
            />
          )}

          {section === "users" && (
            <UsersSection
              users={users}
              loading={loading.users}
              currentUserId={currentUser?.id}
              onReload={(params) => {
                // `params` is optional — UsersSection passes
                // `{ q: <current search string> }` so the Refresh button
                // doubles as a "search the database" action. Empty
                // params just reloads everything.
                loadUsers(params || {});
                loadStats();
              }}
              onChangeRole={async (id, role) => {
                try {
                  const res = await updateUserRole(id, role);
                  // The backend message describes WHEN the change takes
                  // effect ("on next sign-in / within ~1h on token
                  // refresh"). Use a longer-lived toast so the admin
                  // actually reads it instead of dismissing reflexively.
                  toast.success(res.data?.message || "Role updated", {
                    autoClose: 6000,
                  });
                  await loadUsers();
                  await loadStats();
                } catch (err) {
                  toast.error(
                    err.response?.data?.message ||
                      err.response?.data?.error ||
                      "Failed to update role"
                  );
                }
              }}
              onChangeStatus={async (id, accountStatus) => {
                try {
                  const res = await updateUserStatus(id, accountStatus);
                  // BANNED/INACTIVE messages explain that the live
                  // access token still works for up to one TTL — admin
                  // needs that context, so we keep the toast on screen
                  // a little longer than the default.
                  toast.success(res.data?.message || "Status updated", {
                    autoClose: 6000,
                  });
                  await loadUsers();
                  await loadStats();
                } catch (err) {
                  toast.error(
                    err.response?.data?.message ||
                      err.response?.data?.error ||
                      "Failed to update status"
                  );
                }
              }}
              onDeleteUser={async (id) => {
                try {
                  const res = await deleteUser(id);
                  toast.success(res.data?.message || "User deleted");
                  await loadUsers();
                  await loadStats();
                } catch (err) {
                  toast.error(
                    err.response?.data?.message ||
                      err.response?.data?.error ||
                      "Failed to delete user"
                  );
                }
              }}
            />
          )}

          {section === "books" && (
            <BooksSection
              books={books}
              loading={loading.books}
              onReload={() => {
                loadBooks();
                loadStats();
              }}
            />
          )}

          {section === "support" && (
            <SupportSection currentUserId={currentUser?.id} />
          )}
        </main>
      </div>
    </div>
  );
};


const Sidebar = ({
  section,
  setSection,
  currentUser,
  mobileOpen,
  onCloseMobile,
}) => {
  const initial = (currentUser?.username || currentUser?.email || "A")
    .slice(0, 1)
    .toUpperCase();

  const NavList = (
    <nav className="px-3 py-4 space-y-1">
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const active = section === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              setSection(id);
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
              ${active
                ? "bg-[#D34F4E] text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-100"}`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white min-h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Digital Library
          </p>
          <p className="mt-0.5 text-lg font-bold text-[#D34F4E]">Admin Panel</p>
        </div>
        {NavList}
        <div className="mt-auto border-t border-gray-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#D34F4E] text-white flex items-center justify-center font-bold">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {currentUser?.username || "Admin"}
              </p>
              <p className="truncate text-xs text-gray-500">
                {currentUser?.email}
              </p>
            </div>
          </div>
          <LogoutButton
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
            iconClassName="h-4 w-4"
          />
        </div>
      </aside>

     
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-64 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-sm font-bold text-[#D34F4E]">Admin Panel</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            {NavList}
            <div className="mt-auto border-t border-gray-100 px-4 py-4">
              <LogoutButton
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                iconClassName="h-4 w-4"
              />
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

const PageHeader = ({ section }) => {
  const titles = {
    overview: { title: "Overview", subtitle: "Snapshot of users and catalog." },
    users: {
      title: "User management",
      subtitle: "Search, change roles, activate or deactivate accounts.",
    },
    books: {
      title: "Book management",
      subtitle: "Browse the catalog by category, add, edit, or delete books.",
    },
    support: {
      title: "Support tickets",
      subtitle: "Read incoming requests, reply, and move them to resolution.",
    },
  };
  const meta = titles[section] || titles.overview;
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-[#D34F4E] sm:text-3xl">
        {meta.title}
      </h1>
      <p className="mt-1 text-sm text-gray-600">{meta.subtitle}</p>
    </div>
  );
};


const OverviewSection = ({ users, books, stats, loading }) => {
  // Prefer DB-authoritative counts from the user-service stats endpoint
  // (`/users/admin/stats`). Fall back to client-side aggregation only if
  // that endpoint is unreachable, so the dashboard still shows *something*
  // useful even when the stats request fails.
  const totalUsers = stats?.totalUsers ?? users.length;
  const activeUsers =
    stats?.activeUsers ??
    users.filter(
      (u) => (u.accountStatus || "ACTIVE").toUpperCase() === "ACTIVE"
    ).length;
  const totalTickets = stats?.totalTickets ?? null;
  const openTickets = stats?.openTickets ?? null;

  // Book + category totals — the backend now reports both via raw COUNT()
  // against the books table, which is correct even when the catalog has
  // more rows than the frontend chose to download.
  const totalBooks = stats?.totalBooks ?? books.length;
  const totalCategories =
    stats?.totalCategories ??
    new Set(
      books
        .map((b) => Number(b.categoryId ?? b.category_id))
        .filter((c) => Number.isFinite(c))
    ).size;

  const loadingUsers = loading.users || loading.stats;
  const loadingBooks = loading.books || loading.stats;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total users" value={totalUsers} loading={loadingUsers} />
        <StatCard
          label="Active users"
          value={activeUsers}
          loading={loadingUsers}
        />
        <StatCard label="Total books" value={totalBooks} loading={loadingBooks} />
        <StatCard
          label="Categories"
          value={totalCategories}
          loading={loadingBooks}
        />
        <StatCard
          label="Support tickets"
          value={totalTickets ?? "—"}
          loading={loading.stats}
          hint={
            openTickets !== null && totalTickets !== null
              ? `${openTickets} open`
              : null
          }
        />
      </div>
    </section>
  );
};

const StatCard = ({ label, value, loading, hint }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
      {label}
    </p>
    <p className="mt-1 text-3xl font-bold text-[#D34F4E]">
      {loading ? "—" : value}
    </p>
    {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
  </div>
);


const UsersSection = ({
  users,
  loading,
  currentUserId,
  onReload,
  onChangeRole,
  onChangeStatus,
  onDeleteUser,
}) => {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [confirmStatus, setConfirmStatus] = useState(null); // { user, nextStatus }
  const [confirmDelete, setConfirmDelete] = useState(null); // user

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      const status = (u.accountStatus || "ACTIVE").toUpperCase();
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(u.username || "").toLowerCase().includes(q) ||
        String(u.email || "").toLowerCase().includes(q) ||
        String(u.id || "").includes(q)
      );
    });
  }, [users, query, roleFilter, statusFilter]);

  return (
    <section>
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-[1fr,auto,auto,auto] gap-3">
        <input
          type="search"
          placeholder="Search by name, email or ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#D34F4E] focus:outline-none focus:ring-2 focus:ring-[#D34F4E]/20"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          // If the admin has typed a search term, re-fetch from the DB
          // with that term as a server-side filter. This is belt-and-
          // braces: client-side filtering on the already-loaded `users`
          // array is the primary path and works for moderate catalogs.
          // The server filter exists so very large user tables still
          // return relevant matches even if the local cache is partial.
          onClick={() => onReload(query.trim() ? { q: query.trim() } : {})}
          title={
            query.trim()
              ? `Refresh from DB with search "${query.trim()}"`
              : "Refresh from DB"
          }
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-700">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  Loading users…
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  No users match the current filters.
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((u) => {
                const status = (u.accountStatus || "ACTIVE").toUpperCase();
                const isSelf = String(u.id) === String(currentUserId);
                return (
                  <tr key={u.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#D34F4E]/10 text-[#D34F4E] flex items-center justify-center text-xs font-bold">
                          {(u.username || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {u.username || "—"}
                            {isSelf && (
                              <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-[#D34F4E]">
                                you
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">ID #{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 break-all">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => onChangeRole(u.id, e.target.value)}
                        title={isSelf ? "You cannot change your own role" : "Change role"}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs disabled:opacity-60"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          STATUS_STYLE[status] || STATUS_STYLE.ACTIVE
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${
                          u.isVerified ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {u.isVerified ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {status !== "ACTIVE" && (
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() =>
                              setConfirmStatus({ user: u, nextStatus: "ACTIVE" })
                            }
                            className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                        {status !== "INACTIVE" && (
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() =>
                              setConfirmStatus({ user: u, nextStatus: "INACTIVE" })
                            }
                            className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        )}
                        {status !== "BANNED" && (
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() =>
                              setConfirmStatus({ user: u, nextStatus: "BANNED" })
                            }
                            className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Ban
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => setConfirmDelete(u)}
                          title={
                            isSelf
                              ? "You cannot delete your own account from the admin table. Use the Profile tab instead."
                              : "Permanently delete this account"
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-40"
                        >
                          <FiTrash2 className="text-[11px]" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete user account"
          message={`Permanently delete ${
            confirmDelete.username || confirmDelete.email
          }? Their support tickets will also be removed. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            await onDeleteUser(confirmDelete.id);
            setConfirmDelete(null);
          }}
        />
      )}

      {confirmStatus && (
        <ConfirmDialog
          title={`${confirmStatus.nextStatus === "ACTIVE" ? "Activate" : confirmStatus.nextStatus === "INACTIVE" ? "Deactivate" : "Ban"} user`}
          message={`Are you sure you want to set ${
            confirmStatus.user.username || confirmStatus.user.email
          } to ${confirmStatus.nextStatus}?`}
          confirmLabel="Confirm"
          danger={confirmStatus.nextStatus !== "ACTIVE"}
          onCancel={() => setConfirmStatus(null)}
          onConfirm={async () => {
            await onChangeStatus(confirmStatus.user.id, confirmStatus.nextStatus);
            setConfirmStatus(null);
          }}
        />
      )}
    </section>
  );
};


// Book management moved out of this dashboard: admins now create, edit,
// and delete books directly on the public category pages (see
// `pages/CategoryBooks.jsx`). Keeping the dashboard focused on data that
// has no natural home elsewhere — users + support tickets.

const ConfirmDialog = ({
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  onCancel,
  onConfirm,
}) => {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
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
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[#D34F4E] hover:bg-[#c04544]"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Book management — full CRUD grouped by category.
// Mirrors the inline experience on `/categories/:category` so admins
// have a single bird's-eye view of the entire catalog.
// ============================================================
const BooksSection = ({ books, loading, onReload }) => {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [editor, setEditor] = useState(null); // { mode, book? }
  const [confirmDelete, setConfirmDelete] = useState(null);

  const normalize = (b) => ({
    id: b.id,
    title: b.title || "",
    author: b.author || "",
    image: b.image || "",
    description: b.description || "",
    categoryId: Number(b.categoryId ?? b.category_id) || null,
    totalCopies: Number(b.totalCopies ?? b.total_copies) || 0,
    availableCopies: Number(b.availableCopies ?? b.available_copies) || 0,
    isPopular: Boolean(b.isPopular ?? b.is_popular),
  });

  const list = useMemo(() => books.map(normalize), [books]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((b) => {
      if (
        categoryFilter !== "ALL" &&
        Number(b.categoryId) !== Number(categoryFilter)
      )
        return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        String(b.id).includes(q)
      );
    });
  }, [list, query, categoryFilter]);

  // Group by category so admins scan the catalog the way users do.
  const grouped = useMemo(() => {
    const buckets = new Map();
    for (const b of filtered) {
      const key = b.categoryId ?? "uncategorized";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(b);
    }
    return [...buckets.entries()].sort((a, b) => {
      if (a[0] === "uncategorized") return 1;
      if (b[0] === "uncategorized") return -1;
      return Number(a[0]) - Number(b[0]);
    });
  }, [filtered]);

  const handleSave = async (form, mode) => {
    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      image: form.image.trim() || null,
      description: form.description.trim() || null,
      categoryId: Number(form.categoryId),
      totalCopies: Number(form.totalCopies),
      isPopular: Boolean(form.isPopular),
    };
    if (form.availableCopies !== "") {
      payload.availableCopies = Number(form.availableCopies);
    }
    if (!payload.title || !payload.author) {
      throw new Error("Title and author are required");
    }
    if (!Number.isFinite(payload.categoryId) || payload.categoryId < 1) {
      throw new Error("Pick a valid category");
    }
    if (!Number.isFinite(payload.totalCopies) || payload.totalCopies < 1) {
      throw new Error("Total copies must be at least 1");
    }

    if (mode === "create") {
      // POST /books goes through gRPC AddBook which doesn't carry the
      // is_popular flag in the proto. Persist it via a follow-up PATCH
      // when the admin explicitly opted in.
      const createRes = await createBook(payload);
      if (payload.isPopular) {
        const newId = createRes.data?.id ?? createRes.data?.book?.id;
        if (newId) {
          await setBookPopular(newId, true).catch(() => null);
        }
      }
      toast.success("Book added to catalog");
    } else {
      await updateBook(editor.book.id, payload);
      toast.success("Book updated");
    }
    setEditor(null);
    await onReload();
  };

  const handleTogglePopular = async (book) => {
    try {
      await setBookPopular(book.id, !book.isPopular);
      toast.success(
        !book.isPopular
          ? `"${book.title}" added to Popular Now`
          : `"${book.title}" removed from Popular Now`
      );
      await onReload();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Could not update Popular Now"
      );
    }
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto,auto,auto]">
        <input
          type="search"
          placeholder="Search by title, author or id…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#D34F4E] focus:outline-none focus:ring-2 focus:ring-[#D34F4E]/20"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All categories</option>
          {BOOK_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setEditor({ mode: "create", book: null })}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D34F4E] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c04544]"
        >
          <FiPlus />
          New book
        </button>
      </div>

      {loading && list.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Loading catalog…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No books match your filters.
        </div>
      )}

      {grouped.map(([categoryId, items]) => (
        <section key={String(categoryId)} className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {categoryId === "uncategorized"
                ? "Uncategorized"
                : labelForCategory(categoryId)}
            </h2>
            <span className="text-xs text-gray-500">{items.length} books</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-700">
                <tr>
                  <th className="px-3 py-3 sm:px-4">Book</th>
                  <th className="px-3 py-3 sm:px-4">Author</th>
                  <th className="px-3 py-3 sm:px-4">Copies</th>
                  <th className="px-3 py-3 sm:px-4">Popular</th>
                  <th className="px-3 py-3 text-right sm:px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/80">
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-gray-100">
                          {/* eslint-disable-next-line jsx-a11y/alt-text */}
                          <img
                            {...coverImgProps(b.image)}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {b.title}
                          </p>
                          <p className="text-xs text-gray-500">ID #{b.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-700 sm:px-4">
                      {b.author}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      <span className="font-medium text-gray-800">
                        {b.availableCopies}
                      </span>
                      <span className="text-gray-400"> / {b.totalCopies}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePopular(b)}
                        title={
                          b.isPopular
                            ? "Remove from Popular Now"
                            : "Add to Popular Now"
                        }
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 transition ${
                          b.isPopular
                            ? "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100"
                            : "bg-gray-50 text-gray-600 ring-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <FiStar
                          className={b.isPopular ? "fill-current" : ""}
                        />
                        {b.isPopular ? "Popular" : "Mark"}
                      </button>
                    </td>
                    <td className="space-x-2 whitespace-nowrap px-3 py-3 text-right sm:px-4">
                      <button
                        type="button"
                        onClick={() => setEditor({ mode: "edit", book: b })}
                        className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        <FiEdit2 className="text-[11px]" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(b)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        <FiTrash2 className="text-[11px]" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {editor && (
        <BookEditorModal
          mode={editor.mode}
          book={editor.book}
          onCancel={() => setEditor(null)}
          onSave={(form) => handleSave(form, editor.mode)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete book"
          message={`Permanently delete "${confirmDelete.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            try {
              await deleteBook(confirmDelete.id);
              toast.success("Book deleted");
              setConfirmDelete(null);
              await onReload();
            } catch (err) {
              toast.error(
                err.response?.data?.message ||
                  err.response?.data?.error ||
                  "Delete failed"
              );
            }
          }}
        />
      )}
    </>
  );
};

const BookEditorModal = ({ mode, book, onCancel, onSave }) => {
  const [form, setForm] = useState(() => ({
    title: book?.title || "",
    author: book?.author || "",
    image: book?.image || "",
    description: book?.description || "",
    categoryId: String(
      book?.categoryId ?? BOOK_CATEGORIES[0]?.id ?? 1
    ),
    totalCopies: String(book?.totalCopies ?? 1),
    availableCopies:
      book?.availableCopies != null && book.availableCopies !== 0
        ? String(book.availableCopies)
        : "",
    isPopular: Boolean(book?.isPopular),
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
            <FormField label="Title" required>
              <input
                required
                maxLength={255}
                value={form.title}
                onChange={setField("title")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Author" required>
              <input
                required
                maxLength={255}
                value={form.author}
                onChange={setField("author")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Category" required>
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
            </FormField>
            <FormField
              label="Cover image"
              hint="Relative path like /images/book1.jpg, a full https URL, or leave blank. Files must exist in frontend/public/images/. Preview below shows what users will see — broken paths fall back to a default cover automatically."
            >
              <div className="flex items-start gap-3">
                <input
                  // Plain text — `type=url` would HTML5-block relative
                  // paths like /images/book1.jpg before the form submits.
                  type="text"
                  maxLength={512}
                  placeholder="/images/book1.jpg or https://…"
                  value={form.image}
                  onChange={setField("image")}
                  className="w-full flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <img
                    {...coverImgProps(form.image)}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </FormField>
            <FormField label="Total copies" required>
              <input
                type="number"
                min="1"
                required
                value={form.totalCopies}
                onChange={setField("totalCopies")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </FormField>
            <FormField
              label="Available copies"
              hint={
                mode === "create"
                  ? "Defaults to total copies."
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
            </FormField>
          </div>

          <FormField label="Description">
            <textarea
              rows={4}
              maxLength={5000}
              value={form.description}
              onChange={setField("description")}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </FormField>

          <label className="flex items-start gap-3 rounded-lg border border-amber-200/70 bg-amber-50/50 px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={form.isPopular}
              onChange={(e) =>
                setForm((f) => ({ ...f, isPopular: e.target.checked }))
              }
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#D34F4E] focus:ring-[#D34F4E]/30"
            />
            <span>
              <span className="font-semibold text-amber-900">
                Feature in Popular Now
              </span>
              <span className="mt-0.5 block text-[11px] text-amber-800/80">
                Showcases this book on the homepage carousel.
              </span>
            </span>
          </label>

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
};

const FormField = ({ label, required, hint, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
      {label} {required && <span className="text-red-500">*</span>}
    </span>
    {children}
    {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
  </label>
);

// ============================================================
// Admin Support / Help-desk
// ============================================================
const SupportSection = ({ currentUserId }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: "ALL", category: "ALL", q: "" });
  const [activeId, setActiveId] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [loadingActive, setLoadingActive] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replying, setReplying] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status !== "ALL") params.status = filters.status;
      if (filters.category !== "ALL") params.category = filters.category;
      const res = await getSupportTickets(params);
      setTickets(Array.isArray(res.data?.tickets) ? res.data.tickets : []);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load tickets"
      );
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.category]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openTicket = useCallback(async (id) => {
    setActiveId(id);
    setActiveTicket(null);
    setReplyDraft("");
    setLoadingActive(true);
    try {
      const res = await getSupportTicket(id);
      setActiveTicket(res.data?.ticket || null);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Could not load ticket"
      );
    } finally {
      setLoadingActive(false);
    }
  }, []);

  const refreshActive = useCallback(async () => {
    if (!activeId) return;
    try {
      const res = await getSupportTicket(activeId);
      setActiveTicket(res.data?.ticket || null);
    } catch {
      /* ignore */
    }
  }, [activeId]);

  const handleReply = async (e) => {
    e.preventDefault();
    const msg = replyDraft.trim();
    if (!msg || !activeTicket) return;
    setReplying(true);
    try {
      const res = await replySupportTicket(activeTicket.id, { message: msg });
      setActiveTicket(res.data?.ticket || activeTicket);
      setReplyDraft("");
      loadList();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to send reply"
      );
    } finally {
      setReplying(false);
    }
  };

  const handleStatus = async (status) => {
    if (!activeTicket) return;
    try {
      const res = await updateSupportTicketStatus(activeTicket.id, status);
      toast.success(res.data?.message || `Marked ${status}`);
      await refreshActive();
      loadList();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to update status"
      );
    }
  };

  const handlePriority = async (priority) => {
    if (!activeTicket) return;
    try {
      const res = await updateSupportTicketPriority(activeTicket.id, priority);
      toast.success(res.data?.message || `Priority ${priority}`);
      await refreshActive();
      loadList();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to update priority"
      );
    }
  };

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) => {
      const u = t.requester || {};
      return (
        String(t.id).includes(q) ||
        String(t.subject || "").toLowerCase().includes(q) ||
        String(u.username || "").toLowerCase().includes(q) ||
        String(u.email || "").toLowerCase().includes(q)
      );
    });
  }, [tickets, filters.q]);

  const counts = useMemo(() => {
    const out = { open: 0, pending: 0, resolved: 0, closed: 0 };
    for (const t of tickets) out[t.status] = (out[t.status] || 0) + 1;
    return out;
  }, [tickets]);

  return (
    <section>
      {/* Quick stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TICKET_STATUS_OPTIONS.map((s) => (
          <div
            key={s}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {s}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#D34F4E]">
              {counts[s] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto,auto,auto]">
        <input
          type="search"
          placeholder="Search subject, user or ID…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#D34F4E] focus:outline-none focus:ring-2 focus:ring-[#D34F4E]/20"
        />
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value }))
          }
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          {TICKET_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.category}
          onChange={(e) =>
            setFilters((f) => ({ ...f, category: e.target.value }))
          }
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All categories</option>
          {TICKET_CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={loadList}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Ticket list */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
          <div className="max-h-[640px] overflow-y-auto divide-y divide-gray-100">
            {loading && tickets.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                Loading tickets…
              </p>
            )}
            {!loading && filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                No tickets match.
              </p>
            )}
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openTicket(t.id)}
                className={`block w-full px-4 py-3 text-left transition hover:bg-gray-50 ${
                  activeId === t.id ? "bg-[#D34F4E]/5" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {t.subject}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      TICKET_STATUS_STYLE[t.status] || TICKET_STATUS_STYLE.open
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  #{t.id} · {t.category} ·{" "}
                  {t.requester?.username || t.requester?.email || `user ${t.userId}`}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  Updated {fmtDateTime(t.updatedAt)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
          {!activeId ? (
            <div className="grid h-full min-h-[320px] place-items-center px-6 py-10 text-center text-sm text-gray-500">
              Select a ticket on the left to view the conversation.
            </div>
          ) : loadingActive ? (
            <div className="grid h-full min-h-[320px] place-items-center px-6 py-10 text-sm text-gray-500">
              Loading…
            </div>
          ) : activeTicket ? (
            <AdminTicketDetail
              ticket={activeTicket}
              currentUserId={currentUserId}
              replyDraft={replyDraft}
              setReplyDraft={setReplyDraft}
              replying={replying}
              onReply={handleReply}
              onChangeStatus={handleStatus}
              onChangePriority={handlePriority}
            />
          ) : (
            <div className="grid h-full min-h-[320px] place-items-center px-6 py-10 text-sm text-gray-500">
              Ticket unavailable.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const AdminTicketDetail = ({
  ticket,
  currentUserId,
  replyDraft,
  setReplyDraft,
  replying,
  onReply,
  onChangeStatus,
  onChangePriority,
}) => {
  const closed = ticket.status === "closed";
  return (
    <>
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900">
              {ticket.subject}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              #{ticket.id} · {ticket.category} · opened{" "}
              {fmtDateTime(ticket.createdAt)}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              From{" "}
              <span className="font-medium">
                {ticket.requester?.username ||
                  ticket.requester?.email ||
                  `user ${ticket.userId}`}
              </span>
              {ticket.requester?.email ? (
                <span className="text-gray-400"> · {ticket.requester.email}</span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <label className="text-xs text-gray-500">
              Status
              <select
                value={ticket.status}
                onChange={(e) => onChangeStatus(e.target.value)}
                className="ml-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
              >
                {TICKET_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-500">
              Priority
              <select
                value={ticket.priority}
                onChange={(e) => onChangePriority(e.target.value)}
                className="ml-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
              >
                {TICKET_PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="max-h-[440px] space-y-3 overflow-y-auto px-5 py-4">
        <AdminBubble
          mine={ticket.userId === currentUserId}
          authorRole="user"
          author={ticket.requester}
          message={ticket.message}
          createdAt={ticket.createdAt}
        />
        {(ticket.replies || []).map((r) => (
          <AdminBubble
            key={r.id}
            mine={r.authorId === currentUserId}
            authorRole={r.authorRole}
            author={r.author}
            message={r.message}
            createdAt={r.createdAt}
          />
        ))}
      </div>

      {!closed ? (
        <form onSubmit={onReply} className="border-t border-gray-100 px-5 py-4">
          <textarea
            rows={3}
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            placeholder="Type your reply to the user…"
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#D34F4E] focus:outline-none focus:ring-2 focus:ring-[#D34F4E]/20"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-gray-400">
              Replying as admin marks the ticket as pending.
            </p>
            <button
              type="submit"
              disabled={replying || !replyDraft.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#D34F4E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#c04544] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSend className="text-[11px]" />
              {replying ? "Sending…" : "Send reply"}
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          This ticket is closed. Reopen it from the status dropdown to add more
          replies.
        </p>
      )}
    </>
  );
};

const AdminBubble = ({ mine, authorRole, author, message, createdAt }) => {
  const isAdmin = authorRole === "admin";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm ${
          mine
            ? "bg-[#D34F4E] text-white"
            : isAdmin
            ? "bg-blue-50 text-blue-900 ring-1 ring-blue-100"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
          {author?.username || (isAdmin ? "Support" : `user ${""}`)}
          <span className="opacity-70"> · {fmtDateTime(createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words">{message}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
