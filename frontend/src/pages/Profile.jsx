import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaBook,
  FaCamera,
  FaEnvelope,
  FaExclamationTriangle,
  FaRedo,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";
import PageContainer from "../components/layout/PageContainer";
import {
  getAuthProfile,
  getBorrowedBooks,
  returnBook,
} from "../services/api";
import { isAdminRole } from "../utils/roles.js";

const TABS = [
  { id: "borrowed", label: "Borrowed" },
  { id: "overdue", label: "Overdue" },
  { id: "returned", label: "Returned" },
];

const asBorrowList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.borrows)) return data.borrows;
  return [];
};

const formatRole = (role) => {
  const key = String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/^role_/, "");
  if (key === "admin") return "Administrator";
  if (key === "librarian") return "Librarian";
  if (key === "user") return "Member";
  return role || "Member";
};

const statusStyles = {
  ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  INACTIVE: "bg-gray-100 text-gray-700 ring-gray-200",
  BANNED: "bg-red-50 text-red-800 ring-red-200",
};

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-40 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/80">
            <div className="mx-auto h-24 w-24 rounded-full bg-gray-200" />
            <div className="mx-auto mt-4 h-5 w-32 rounded bg-gray-200" />
            <div className="mx-auto mt-2 h-4 w-24 rounded bg-gray-200" />
          </div>
        </div>
        <div className="lg:col-span-8 space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="aspect-[3/4] rounded-xl bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const Profile = () => {
  const userId = localStorage.getItem("userId");
  const storageKey = `profileImage_${userId}`;

  const [user, setUser] = useState(null);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [profileImage, setProfileImage] = useState(
    () => localStorage.getItem(storageKey) || null
  );
  const [activeTab, setActiveTab] = useState("borrowed");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [returningId, setReturningId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedBorrowId, setSelectedBorrowId] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setError("Session expired. Please sign in again.");
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const [userRes, borrowRes] = await Promise.all([
        getAuthProfile(userId),
        getBorrowedBooks(userId),
      ]);

      setUser(userRes.data);
      setBorrowedBooks(asBorrowList(borrowRes.data));

      const fromApi =
        userRes.data?.profileImage ?? userRes.data?.profile_image;
      if (fromApi) {
        setProfileImage(fromApi);
        localStorage.setItem(storageKey, fromApi);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Could not load your profile.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [userId, storageKey]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const today = useMemo(() => new Date(), []);

  const returnDateOf = (b) => b.returnDate ?? b.return_date;
  const dueDateOf = (b) => b.dueDate ?? b.due_date;

  const { borrowed, overdue, returned } = useMemo(() => {
    const list = Array.isArray(borrowedBooks) ? borrowedBooks : [];
    return {
      borrowed: list.filter((b) => {
        const rd = returnDateOf(b);
        const dd = dueDateOf(b);
        return !rd && (!dd || new Date(dd) >= today);
      }),
      overdue: list.filter((b) => {
        const dd = dueDateOf(b);
        return dd && new Date(dd) < today && !returnDateOf(b);
      }),
      returned: list.filter((b) => !!returnDateOf(b)),
    };
  }, [borrowedBooks, today]);

  const activeBooks = useMemo(() => {
    if (activeTab === "borrowed") return borrowed;
    if (activeTab === "overdue") return overdue;
    return returned;
  }, [activeTab, borrowed, overdue, returned]);

  const isAdmin = isAdminRole(user?.role);
  const accountStatus = String(
    user?.accountStatus ?? user?.account_status ?? "ACTIVE"
  ).toUpperCase();

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      setProfileImage(url);
      localStorage.setItem(storageKey, url);
      toast.success("Profile photo updated on this device.");
    };
    reader.onerror = () => toast.error("Could not read that image.");
    reader.readAsDataURL(file);
  };

  const handleReturn = async (id) => {
    setReturningId(id);
    try {
      await returnBook(id);
      const now = new Date().toISOString();
      setBorrowedBooks((prev) =>
        prev.map((b) => {
          if (String(b.id) !== String(id)) return b;
          return {
            ...b,
            returnDate: now,
            return_date: now,
            status: "RETURNED",
          };
        })
      );
      toast.success("Book returned successfully.");
    } catch (err) {
      const msg =
        err.response?.data?.error || err.message || "Return failed.";
      toast.error(msg);
    } finally {
      setReturningId(null);
    }
  };

  const confirmReturn = (id) => {
    setSelectedBorrowId(id);
    setShowModal(true);
  };

  const BorrowCard = ({ book }) => {
    const title = book.bookTitle || book.Book?.title || "Unknown Title";
    const author = book.bookAuthor || book.Book?.author || "Unknown Author";
    const image = book.bookImage || book.Book?.image || "/placeholder.jpg";
    const due = book.dueDate ?? book.due_date;
    const returnedAt = book.returnDate ?? book.return_date;
    const isReturning = returningId === book.id;

    return (
      <article className="group relative min-w-0 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-200/80 transition hover:shadow-lg">
        <div className="relative aspect-[3/4] w-full">
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
            <h3 className="line-clamp-2 text-sm font-semibold">{title}</h3>
            <p className="line-clamp-1 text-xs text-gray-300">{author}</p>
            {due && (
              <p className="mt-1 text-[10px] text-gray-300">
                Due: {new Date(due).toLocaleDateString()}
              </p>
            )}
            {activeTab !== "returned" && !returnedAt && (
              <button
                type="button"
                disabled={isReturning}
                onClick={() => confirmReturn(book.id)}
                className="mt-2 w-full min-h-[40px] rounded-xl bg-white text-xs font-semibold text-gray-900 transition hover:bg-emerald-500 hover:text-white disabled:opacity-60"
              >
                {isReturning ? "Returning…" : "Return book"}
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-[#f5efe9]">
        <PageContainer className="py-6 sm:py-8">
          <ProfileSkeleton />
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f5efe9]">
      <PageContainer className="py-5 sm:py-8">
        <Link
          to="/home"
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-gray-200/80 transition hover:ring-[#D34F4E]/40"
        >
          <FaArrowLeft className="text-[#D34F4E]" />
          Back to library
        </Link>

        {error && (
          <div
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-600" />
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={loadProfile}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              <FaRedo />
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Profile sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-gray-200/80 lg:sticky lg:top-24">
              <div className="h-20 bg-gradient-to-r from-[#D34F4E] to-[#c04544]" />
              <div className="relative px-5 pb-6 pt-0 sm:px-6">
                <div className="-mt-12 mx-auto w-fit">
                  <div className="group relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-[#D34F4E] shadow-md">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                        {user?.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <label
                      className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100"
                      title="Change photo (saved on this device)"
                    >
                      <FaCamera className="text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                  <label className="mt-2 block cursor-pointer text-center text-xs font-medium text-[#D34F4E] hover:underline">
                    Change photo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>

                <div className="mt-4 text-center">
                  <h1 className="break-words text-lg font-bold text-gray-900 sm:text-xl">
                    {user?.username || "Member"}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatRole(user?.role)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#D34F4E]/10 px-3 py-1 text-xs font-semibold text-[#D34F4E] ring-1 ring-[#D34F4E]/25">
                        <FaShieldAlt />
                        Admin
                      </span>
                    )}
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                        statusStyles[accountStatus] || statusStyles.ACTIVE
                      }`}
                    >
                      {accountStatus}
                    </span>
                  </div>
                </div>

                <dl className="mt-6 space-y-3 border-t border-gray-100 pt-5 text-sm">
                  <div className="flex items-start gap-3 text-gray-700">
                    <FaEnvelope className="mt-0.5 shrink-0 text-[#D34F4E]" />
                    <div className="min-w-0">
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Email
                      </dt>
                      <dd className="break-all">{user?.email || "—"}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-gray-700">
                    <FaUser className="mt-0.5 shrink-0 text-[#D34F4E]" />
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Username
                      </dt>
                      <dd>{user?.username || "—"}</dd>
                    </div>
                  </div>
                </dl>

                {isAdmin && (
                  <nav
                    className="mt-6 space-y-2 border-t border-gray-100 pt-5"
                    aria-label="Admin shortcuts"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Admin
                    </p>
                    <Link
                      to="/admin"
                      className="flex min-h-[44px] items-center justify-center rounded-xl bg-[#D34F4E] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c04544]"
                    >
                      Admin dashboard
                    </Link>
                  </nav>
                )}

                <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                  <StatPill label="Borrowed" value={borrowed.length} />
                  <StatPill label="Overdue" value={overdue.length} accent />
                  <StatPill label="Returned" value={returned.length} />
                </div>
              </div>
            </div>
          </aside>

          {/* Library */}
          <main className="min-w-0 lg:col-span-8 xl:col-span-9">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                  <FaBook className="text-[#D34F4E]" />
                  My library
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Track borrowed, overdue, and returned titles.
                </p>
              </div>
            </div>

            <div
              className="mb-6 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Borrowing tabs"
            >
              {TABS.map((tab) => {
                const count =
                  tab.id === "borrowed"
                    ? borrowed.length
                    : tab.id === "overdue"
                      ? overdue.length
                      : returned.length;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition touch-manipulation ${
                      active
                        ? "bg-[#D34F4E] text-white shadow-md shadow-[#D34F4E]/20"
                        : "bg-white text-gray-700 ring-1 ring-gray-200/80 hover:ring-[#D34F4E]/30"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        active ? "bg-white/20" : "bg-gray-100"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeBooks.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 sm:gap-4 lg:gap-5">
                {activeBooks.map((item) => (
                  <BorrowCard key={item.id} book={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 px-6 py-14 text-center">
                <FaBook className="mx-auto text-3xl text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-600">
                  No books in “{activeTab}” yet.
                </p>
                <Link
                  to="/home"
                  className="mt-4 inline-block text-sm font-semibold text-[#D34F4E] hover:underline"
                >
                  Browse the catalog
                </Link>
              </div>
            )}
          </main>
        </div>
      </PageContainer>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-title"
          >
            <h2 id="return-title" className="text-lg font-bold text-gray-900">
              Confirm return
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Return this book to the library? You can borrow it again later if
              copies are available.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[44px] flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowModal(false);
                  await handleReturn(selectedBorrowId);
                }}
                className="min-h-[44px] flex-1 rounded-xl bg-[#D34F4E] py-2.5 text-sm font-semibold text-white hover:bg-[#c04544]"
              >
                Confirm return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function StatPill({ label, value, accent }) {
  return (
    <div
      className={`rounded-xl px-2 py-3 ring-1 ${
        accent
          ? "bg-red-50 ring-red-100"
          : "bg-gray-50 ring-gray-100"
      }`}
    >
      <p
        className={`text-lg font-bold ${
          accent && value > 0 ? "text-red-600" : "text-[#D34F4E]"
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
    </div>
  );
}

export default Profile;
