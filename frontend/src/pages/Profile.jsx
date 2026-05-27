import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaBell,
  FaBook,
  FaCamera,
  FaChartBar,
  FaCheckCircle,
  FaEnvelope,
  FaExclamationTriangle,
  FaHeart,
  FaRegHeart,
  FaRedo,
  FaShieldAlt,
  FaTrash,
  FaUser,
  FaIdBadge,
  FaLock,
  FaHistory,
} from "react-icons/fa";
import PageContainer from "../components/layout/PageContainer";
import {
  changeMyPassword,
  deleteMyAccount,
  getAuthProfile,
  getBorrowedBooks,
  returnBook,
  updateMyProfile,
} from "../services/api";
import { AuthContext } from "../../context/AuthContext.jsx";
import { isAdminRole } from "../utils/roles.js";

// ============================================================
// Constants / helpers
// ============================================================
// Sidebar (profile box) hosts account-management tabs.
const SIDEBAR_TABS = [
  { id: "overview", label: "Overview", icon: FaIdBadge },
  { id: "security", label: "Security", icon: FaLock },
];

// Main dashboard area hosts library-centric sections.
const MAIN_SECTIONS = [
  { id: "activity", label: "Activity", icon: FaHistory },
  { id: "stats", label: "Reading stats", icon: FaChartBar },
  { id: "favorites", label: "Favorites", icon: FaHeart },
  { id: "notifications", label: "Notifications", icon: FaBell },
];

const ACTIVITY_TABS = [
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

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
};

const apiErr = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback;

// ---------- Local persistence helpers (per-user) ----------
const lsRead = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const lsWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — silently ignore */
  }
};

const useFavorites = (userId) => {
  const key = `favorites_${userId || "anon"}`;
  const [favorites, setFavorites] = useState(() => lsRead(key, []));

  useEffect(() => {
    lsWrite(key, favorites);
  }, [key, favorites]);

  const isFavorite = useCallback(
    (id) => favorites.some((f) => String(f.id) === String(id)),
    [favorites]
  );

  const toggleFavorite = useCallback((book) => {
    if (!book?.id) return;
    setFavorites((prev) => {
      const exists = prev.some((f) => String(f.id) === String(book.id));
      if (exists) return prev.filter((f) => String(f.id) !== String(book.id));
      return [
        ...prev,
        {
          id: book.id,
          title: book.bookTitle || book.Book?.title || book.title || "Untitled",
          author: book.bookAuthor || book.Book?.author || book.author || "",
          image: book.bookImage || book.Book?.image || book.image || "",
          category: book.bookCategory || book.Book?.category || book.category || null,
          savedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const removeFavorite = useCallback((id) => {
    setFavorites((prev) => prev.filter((f) => String(f.id) !== String(id)));
  }, []);

  return { favorites, isFavorite, toggleFavorite, removeFavorite };
};

// Derive notifications from real borrow data; "read" state persists locally.
const useNotifications = (userId, borrowedBooks) => {
  const readKey = `notifReadIds_${userId || "anon"}`;
  const [readIds, setReadIds] = useState(() => new Set(lsRead(readKey, [])));

  useEffect(() => {
    lsWrite(readKey, Array.from(readIds));
  }, [readKey, readIds]);

  const notifications = useMemo(() => {
    const list = Array.isArray(borrowedBooks) ? borrowedBooks : [];
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const items = [];

    for (const b of list) {
      const title = b.bookTitle || b.Book?.title || "Untitled";
      const returned = b.returnDate ?? b.return_date;
      const due = b.dueDate ?? b.due_date;
      const borrowedAt = b.borrowDate ?? b.borrow_date;

      if (returned) {
        const t = new Date(returned).getTime();
        if (!Number.isNaN(t) && now - t < 30 * day) {
          items.push({
            id: `returned-${b.id}`,
            type: "returned",
            title: `Returned: ${title}`,
            body: `You returned this on ${formatDate(returned)}.`,
            timestamp: returned,
          });
        }
        continue;
      }

      if (due) {
        const dueT = new Date(due).getTime();
        if (!Number.isNaN(dueT)) {
          if (dueT < now) {
            const daysLate = Math.max(1, Math.floor((now - dueT) / day));
            items.push({
              id: `overdue-${b.id}`,
              type: "overdue",
              title: `Overdue: ${title}`,
              body: `Was due ${formatDate(due)} (${daysLate} day${daysLate > 1 ? "s" : ""} late).`,
              timestamp: due,
            });
          } else if (dueT - now < 3 * day) {
            items.push({
              id: `due-soon-${b.id}`,
              type: "due_soon",
              title: `Due soon: ${title}`,
              body: `Due on ${formatDate(due)}.`,
              timestamp: due,
            });
          }
        }
      }

      if (borrowedAt) {
        const t = new Date(borrowedAt).getTime();
        if (!Number.isNaN(t) && now - t < 7 * day) {
          items.push({
            id: `borrowed-${b.id}`,
            type: "borrowed",
            title: `Borrowed: ${title}`,
            body: `Borrowed on ${formatDate(borrowedAt)}.`,
            timestamp: borrowedAt,
          });
        }
      }
    }

    items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return items.map((n) => ({ ...n, read: readIds.has(n.id) }));
  }, [borrowedBooks, readIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback((id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markUnread = useCallback((id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
  }, [notifications]);

  return { notifications, unreadCount, markRead, markUnread, markAllRead };
};

const statusStyles = {
  ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  INACTIVE: "bg-amber-50 text-amber-800 ring-amber-200",
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
          <div className="h-40 rounded-2xl bg-gray-200" />
        </div>
      </div>
    </div>
  );
}


const Profile = () => {
  const userId = localStorage.getItem("userId");
  const storageKey = `profileImage_${userId}`;
  const { logout } = useContext(AuthContext);

  const [sidebarTab, setSidebarTab] = useState("overview");
  const [mainSection, setMainSection] = useState("activity");
  const [user, setUser] = useState(null);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [profileImage, setProfileImage] = useState(
    () => localStorage.getItem(storageKey) || null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const favoritesApi = useFavorites(userId);
  const notificationsApi = useNotifications(userId, borrowedBooks);

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

      const fromApi = userRes.data?.profileImage ?? userRes.data?.profile_image;
      if (fromApi) {
        setProfileImage(fromApi);
        localStorage.setItem(storageKey, fromApi);
      }
    } catch (err) {
      const msg = apiErr(err, "Could not load your profile.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [userId, storageKey]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const isAdmin = isAdminRole(user?.role);
  const accountStatus = String(
    user?.accountStatus ?? user?.account_status ?? "ACTIVE"
  ).toUpperCase();

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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/home"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-gray-200/80 transition hover:ring-[#D34F4E]/40"
          >
            <FaArrowLeft className="text-[#D34F4E]" />
            Back to library
          </Link>

          <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
            {isAdmin ? "Admin Dashboard Profile" : "Your profile"}
          </h1>
        </div>

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
          {/* Identity + Account management (Overview / Security live here) */}
          <aside className="lg:col-span-5 xl:col-span-4">
            <ProfileSidebar
              user={user}
              profileImage={profileImage}
              setProfileImage={setProfileImage}
              storageKey={storageKey}
              accountStatus={accountStatus}
              isAdmin={isAdmin}
              activeTab={sidebarTab}
              onTabChange={setSidebarTab}
              onProfileSaved={loadProfile}
              onLogout={logout}
            />
          </aside>

          {/* Dashboard sections */}
          <main className="min-w-0 lg:col-span-7 xl:col-span-8">
            <nav
              className="mb-5 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Dashboard sections"
            >
              {MAIN_SECTIONS.map(({ id, label, icon: Icon }) => {
                const active = mainSection === id;
                const badge =
                  id === "notifications" && notificationsApi.unreadCount > 0
                    ? notificationsApi.unreadCount
                    : id === "favorites" && favoritesApi.favorites.length > 0
                      ? favoritesApi.favorites.length
                      : null;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMainSection(id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-[#D34F4E] text-white shadow-sm"
                        : "bg-white text-gray-700 ring-1 ring-gray-200/80 hover:ring-[#D34F4E]/30"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    {badge != null && (
                      <span
                        className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          active
                            ? "bg-white/25 text-white"
                            : id === "notifications"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {mainSection === "activity" && (
              <ActivitySection
                borrowedBooks={borrowedBooks}
                setBorrowedBooks={setBorrowedBooks}
                favoritesApi={favoritesApi}
              />
            )}

            {mainSection === "stats" && (
              <StatsSection borrowedBooks={borrowedBooks} />
            )}

            {mainSection === "favorites" && (
              <FavoritesSection favoritesApi={favoritesApi} />
            )}

            {mainSection === "notifications" && (
              <NotificationsSection notificationsApi={notificationsApi} />
            )}
          </main>
        </div>
      </PageContainer>
    </div>
  );
};

// Profile sidebar (identity + Overview/Security tabs)

const ProfileSidebar = ({
  user,
  profileImage,
  setProfileImage,
  storageKey,
  accountStatus,
  isAdmin,
  activeTab,
  onTabChange,
  onProfileSaved,
  onLogout,
}) => (
  <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-gray-200/80 lg:sticky lg:top-24">
    <div className="h-20 bg-gradient-to-r from-[#D34F4E] to-[#c04544]" />
    <div className="relative px-5 pb-6 pt-0 sm:px-6">
      <div className="-mt-12 mx-auto w-fit">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-[#D34F4E] shadow-md">
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
        </div>
      </div>

      <div className="mt-4 text-center">
        <h1 className="break-words text-lg font-bold text-gray-900 sm:text-xl">
          {user?.username || "Member"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{formatRole(user?.role)}</p>

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

      <dl className="mt-5 space-y-3 border-t border-gray-100 pt-4 text-sm">
        <Field icon={<FaEnvelope />} label="Email" value={user?.email} />
        <Field icon={<FaUser />} label="Username" value={user?.username} />
        <Field
          icon={<FaIdBadge />}
          label="Member since"
          value={formatDate(user?.createdAt ?? user?.created_at)}
        />
      </dl>

      {isAdmin && (
        <Link
          to="/admin"
          className="mt-5 flex min-h-[44px] items-center justify-center rounded-xl bg-[#D34F4E] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c04544]"
        >
          Admin dashboard
        </Link>
      )}

      {/* Account-management tabs (Overview / Security) */}
      <div
        className="mt-6 inline-flex w-full gap-1 rounded-xl bg-gray-100 p-1"
        role="tablist"
        aria-label="Account management"
      >
        {SIDEBAR_TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-white text-[#D34F4E] shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {activeTab === "overview" && (
          <OverviewPanel
            user={user}
            profileImage={profileImage}
            setProfileImage={setProfileImage}
            storageKey={storageKey}
            onSaved={onProfileSaved}
          />
        )}
        {activeTab === "security" && (
          <SecurityPanel onAccountDeleted={onLogout} />
        )}
      </div>
    </div>
  </div>
);

const Field = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 text-gray-700">
    <span className="mt-0.5 shrink-0 text-[#D34F4E]">{icon}</span>
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="break-all">{value || "—"}</dd>
    </div>
  </div>
);


// Overview panel (sidebar — Personal info edit)
const OverviewPanel = ({
  user,
  profileImage,
  setProfileImage,
  storageKey,
  onSaved,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftName, setDraftName] = useState(user?.username || "");
  const [draftImage, setDraftImage] = useState(profileImage);

  useEffect(() => {
    setDraftName(user?.username || "");
    setDraftImage(profileImage);
  }, [user?.username, profileImage]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 75_000) {
      toast.error("Image is too large (max 75KB to sync across devices).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraftImage(String(reader.result || ""));
    reader.onerror = () => toast.error("Could not read that image.");
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (draftName !== user?.username) payload.username = draftName;
      if (draftImage !== profileImage) payload.profileImage = draftImage;

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      const res = await updateMyProfile(payload);
      toast.success(res?.data?.message || "Profile updated");

      if (payload.profileImage !== undefined) {
        if (payload.profileImage) {
          localStorage.setItem(storageKey, payload.profileImage);
        } else {
          localStorage.removeItem(storageKey);
        }
        setProfileImage(payload.profileImage || null);
      }
      setEditing(false);
      await onSaved();
    } catch (err) {
      toast.error(apiErr(err, "Could not update profile."));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftName(user?.username || "");
    setDraftImage(profileImage);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Personal info
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Update your display name and profile photo.
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 w-full rounded-lg bg-[#D34F4E] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c04544]"
        >
          Edit profile
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#D34F4E] shadow-sm">
          {draftImage ? (
            <img
              src={draftImage}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 text-white opacity-0 transition hover:opacity-100">
            <FaCamera className="h-3.5 w-3.5" />
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleImageChange}
            />
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Username
          </label>
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={50}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-[#D34F4E] focus:outline-none focus:ring-2 focus:ring-[#D34F4E]/20"
          />
          {draftImage && (
            <button
              type="button"
              onClick={() => setDraftImage(null)}
              className="mt-1 text-[11px] text-red-600 hover:underline"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-[#D34F4E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#c04544] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
};

// Security panel (sidebar — Change Password + Delete Account)
const SecurityPanel = ({ onAccountDeleted }) => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (form.currentPassword === form.newPassword) {
      toast.error("New password must be different from current.");
      return;
    }
    setSaving(true);
    try {
      const res = await changeMyPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success(res?.data?.message || "Password changed");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(apiErr(err, "Could not change password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Change password */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Change password
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Use a strong, unique password — at least 8 characters.
        </p>
        <div className="mt-3 space-y-2.5">
          <PasswordField
            label="Current"
            value={form.currentPassword}
            onChange={(v) => setForm((f) => ({ ...f, currentPassword: v }))}
            autoComplete="current-password"
          />
          <PasswordField
            label="New"
            value={form.newPassword}
            onChange={(v) => setForm((f) => ({ ...f, newPassword: v }))}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm"
            value={form.confirmPassword}
            onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
            autoComplete="new-password"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#D34F4E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#c04544] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>

      {/* Delete account */}
      <div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
        <div className="flex items-start gap-2">
          <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-600" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Delete account
            </p>
            <p className="mt-1 text-xs text-red-700">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
        >
          <FaTrash className="h-3 w-3" />
          Delete my account
        </button>
      </div>

      {confirmDelete && (
        <DeleteAccountModal
          onCancel={() => setConfirmDelete(false)}
          onDeleted={onAccountDeleted}
        />
      )}
    </div>
  );
};

const PasswordField = ({ label, value, onChange, hint, autoComplete }) => (
  <div>
    <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
      {label}
    </label>
    <input
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      autoComplete={autoComplete}
      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-[#D34F4E] focus:outline-none focus:ring-2 focus:ring-[#D34F4E]/20"
    />
    {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
  </div>
);

// Delete account modal — requires password confirmation
const DeleteAccountModal = ({ onCancel, onDeleted }) => {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const canDelete = password.length > 0 && confirmText.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    try {
      await deleteMyAccount({ password });
      toast.success("Your account has been deleted.");
      try {
        await onDeleted();
      } catch {
      }
      window.location.assign("/");
    } catch (err) {
      toast.error(apiErr(err, "Could not delete account."));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
            <FaExclamationTriangle />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">Delete your account?</h2>
            <p className="mt-1 text-sm text-gray-600">
              This action is <span className="font-semibold">permanent and cannot be undone</span>.
              Your profile, borrow history, and personal data will be erased.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Confirm with your password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Type <span className="font-mono">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-[44px] flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete || busy}
            className="min-h-[44px] flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Activity
const ActivitySection = ({ borrowedBooks, setBorrowedBooks, favoritesApi }) => {
  const [activeTab, setActiveTab] = useState("borrowed");
  const [returningId, setReturningId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedBorrowId, setSelectedBorrowId] = useState(null);

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

  const activeBooks =
    activeTab === "borrowed"
      ? borrowed
      : activeTab === "overdue"
        ? overdue
        : returned;

  const lastActivity = useMemo(() => {
    const list = Array.isArray(borrowedBooks) ? borrowedBooks : [];
    if (list.length === 0) return null;
    const timestamps = list
      .flatMap((b) => [b.returnDate ?? b.return_date, b.borrowDate ?? b.borrow_date])
      .filter(Boolean)
      .map((d) => new Date(d).getTime())
      .filter((n) => !Number.isNaN(n));
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps));
  }, [borrowedBooks]);

  const recent = useMemo(() => {
    const list = Array.isArray(borrowedBooks) ? [...borrowedBooks] : [];
    list.sort((a, b) => {
      const aT = new Date(
        a.returnDate ?? a.return_date ?? a.borrowDate ?? a.borrow_date ?? 0
      ).getTime();
      const bT = new Date(
        b.returnDate ?? b.return_date ?? b.borrowDate ?? b.borrow_date ?? 0
      ).getTime();
      return bT - aT;
    });
    return list.slice(0, 5);
  }, [borrowedBooks]);

  const handleReturn = async (id) => {
    setReturningId(id);
    try {
      await returnBook(id);
      const now = new Date().toISOString();
      setBorrowedBooks((prev) =>
        prev.map((b) => {
          if (String(b.id) !== String(id)) return b;
          return { ...b, returnDate: now, return_date: now, status: "RETURNED" };
        })
      );
      toast.success("Book returned successfully.");
    } catch (err) {
      toast.error(apiErr(err, "Return failed."));
    } finally {
      setReturningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="Activity dashboard"
        subtitle="A snapshot of your library activity."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ActivityCard label="Currently borrowed" value={borrowed.length} />
          <ActivityCard label="Overdue" value={overdue.length} danger />
          <ActivityCard label="Returned" value={returned.length} />
          <ActivityCard
            label="Last activity"
            value={lastActivity ? formatDate(lastActivity) : "—"}
            small
          />
        </div>

        {recent.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Recent activity
            </h3>
            <ul className="space-y-2">
              {recent.map((b) => {
                const returned = returnDateOf(b);
                const due = dueDateOf(b);
                const overdueNow = !returned && due && new Date(due) < today;
                return (
                  <li
                    key={b.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        returned
                          ? "bg-emerald-500"
                          : overdueNow
                            ? "bg-red-500"
                            : "bg-amber-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {b.bookTitle || b.Book?.title || "Untitled"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {returned
                          ? `Returned · ${formatDate(returned)}`
                          : overdueNow
                            ? `Overdue · was due ${formatDate(due)}`
                            : due
                              ? `Borrowed · due ${formatDate(due)}`
                              : "Borrowed"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Section>

      <Section
        title="My library"
        subtitle="Track borrowed, overdue, and returned titles."
      >
        <div
          className="mb-5 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Borrowing tabs"
        >
          {ACTIVITY_TABS.map((tab) => {
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
                className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition ${
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
            {activeBooks.map((book) => (
              <BorrowCard
                key={book.id}
                book={book}
                tab={activeTab}
                returningId={returningId}
                onConfirmReturn={(id) => {
                  setSelectedBorrowId(id);
                  setShowModal(true);
                }}
                favoritesApi={favoritesApi}
              />
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
      </Section>

      {showModal && (
        <ConfirmModal
          title="Confirm return"
          message="Return this book to the library? You can borrow it again later if copies are available."
          confirmLabel="Confirm return"
          onCancel={() => setShowModal(false)}
          onConfirm={async () => {
            setShowModal(false);
            await handleReturn(selectedBorrowId);
          }}
        />
      )}
    </div>
  );
};

const BorrowCard = ({ book, tab, returningId, onConfirmReturn, favoritesApi }) => {
  const title = book.bookTitle || book.Book?.title || "Unknown Title";
  const author = book.bookAuthor || book.Book?.author || "Unknown Author";
  const image = book.bookImage || book.Book?.image || "/placeholder.jpg";
  const due = book.dueDate ?? book.due_date;
  const returnedAt = book.returnDate ?? book.return_date;
  const isReturning = returningId === book.id;
  const fav = favoritesApi?.isFavorite(book.id) ?? false;

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-200/80 transition hover:shadow-lg">
      <div className="relative aspect-[3/4] w-full">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {favoritesApi && (
          <button
            type="button"
            onClick={() => {
              favoritesApi.toggleFavorite(book);
              toast.success(fav ? "Removed from favorites" : "Added to favorites");
            }}
            className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full backdrop-blur transition ${
              fav
                ? "bg-red-500 text-white"
                : "bg-white/80 text-gray-700 hover:bg-white"
            }`}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            title={fav ? "Remove from favorites" : "Add to favorites"}
          >
            {fav ? <FaHeart className="h-3.5 w-3.5" /> : <FaRegHeart className="h-3.5 w-3.5" />}
          </button>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <h3 className="line-clamp-2 text-sm font-semibold">{title}</h3>
          <p className="line-clamp-1 text-xs text-gray-300">{author}</p>
          {due && (
            <p className="mt-1 text-[10px] text-gray-300">
              Due: {formatDate(due)}
            </p>
          )}
          {tab !== "returned" && !returnedAt && (
            <button
              type="button"
              disabled={isReturning}
              onClick={() => onConfirmReturn(book.id)}
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

// Reading stats 
const StatsSection = ({ borrowedBooks }) => {
  const list = Array.isArray(borrowedBooks) ? borrowedBooks : [];
  const completed = list.filter((b) => b.returnDate ?? b.return_date);
  const totalRead = completed.length;

  const categoryCounts = useMemo(() => {
    const map = new Map();
    for (const b of list) {
      const cat =
        b.bookCategory ||
        b.Book?.category ||
        b.category ||
        b.Book?.Category?.name ||
        "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [list]);

  const topCategory = categoryCounts[0];

  const months = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString(undefined, { month: "short" }),
        count: 0,
      });
    }
    for (const b of completed) {
      const ts = b.returnDate ?? b.return_date;
      if (!ts) continue;
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.find((x) => x.key === key);
      if (bucket) bucket.count += 1;
    }
    return buckets;
  }, [completed]);

  const maxMonth = Math.max(1, ...months.map((m) => m.count));
  const totalLast6 = months.reduce((sum, m) => sum + m.count, 0);
  const avgPerMonth = (totalLast6 / 6).toFixed(1);
  const bestMonth = [...months].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-6">
      <Section
        title="Reading at a glance"
        subtitle="Insights drawn from your real borrowing history."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ActivityCard label="Total books read" value={totalRead} />
          <ActivityCard
            label="Avg / month (6 mo)"
            value={avgPerMonth}
            small
          />
          <ActivityCard
            label="Best month"
            value={
              bestMonth && bestMonth.count > 0
                ? `${bestMonth.label} · ${bestMonth.count}`
                : "—"
            }
            small
          />
          <ActivityCard
            label="Most read category"
            value={topCategory ? `${topCategory[0]} · ${topCategory[1]}` : "—"}
            small
          />
        </div>
      </Section>

      <Section
        title="Last 6 months"
        subtitle="Books returned per month."
      >
        {totalLast6 === 0 ? (
          <p className="text-sm text-gray-500">
            No completed reads in the last 6 months yet.
          </p>
        ) : (
          <div className="flex h-44 items-end gap-3">
            {months.map((m) => {
              const h = Math.max(4, Math.round((m.count / maxMonth) * 140));
              return (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-gray-700">
                    {m.count}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-[#D34F4E]/90 transition-all"
                    style={{ height: `${h}px` }}
                    aria-label={`${m.label}: ${m.count} books`}
                  />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        title="Categories"
        subtitle="How your reading splits across categories."
      >
        {categoryCounts.length === 0 ? (
          <p className="text-sm text-gray-500">
            Borrow some books to see your category breakdown.
          </p>
        ) : (
          <ul className="space-y-3">
            {categoryCounts.slice(0, 6).map(([name, count]) => {
              const max = categoryCounts[0][1];
              const pct = Math.round((count / max) * 100);
              return (
                <li key={name}>
                  <div className="mb-1 flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-700">{name}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#D34F4E]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
};

// Favorites
const FavoritesSection = ({ favoritesApi }) => {
  const { favorites, removeFavorite } = favoritesApi;

  return (
    <Section
      title="Favorites"
      subtitle="Books you've saved from your borrowing history. Stored on this device."
    >
      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 px-6 py-12 text-center">
          <FaHeart className="mx-auto text-3xl text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">
            No favorites yet.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Open the <span className="font-semibold">Activity</span> tab and tap the
            heart on any book to save it here.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {favorites.map((f) => (
            <li
              key={f.id}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/80"
            >
              <div className="relative aspect-[3/4] w-full">
                {f.image ? (
                  <img
                    src={f.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-gray-100 text-gray-400">
                    <FaBook />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <button
                  type="button"
                  onClick={() => {
                    removeFavorite(f.id);
                    toast.success("Removed from favorites");
                  }}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-red-500 text-white"
                  aria-label="Remove from favorites"
                  title="Remove from favorites"
                >
                  <FaHeart className="h-3.5 w-3.5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <h3 className="line-clamp-2 text-sm font-semibold">{f.title}</h3>
                  {f.author && (
                    <p className="line-clamp-1 text-xs text-gray-300">{f.author}</p>
                  )}
                  {f.savedAt && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      Saved {formatDate(f.savedAt)}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};

// Notifications
const NOTIF_FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "overdue", label: "Overdue" },
  { id: "due_soon", label: "Due soon" },
];

const NOTIF_STYLE = {
  overdue: {
    icon: FaExclamationTriangle,
    iconColor: "text-red-600",
    bg: "bg-red-50",
    ring: "ring-red-200",
  },
  due_soon: {
    icon: FaBell,
    iconColor: "text-amber-600",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
  },
  borrowed: {
    icon: FaBook,
    iconColor: "text-[#D34F4E]",
    bg: "bg-white",
    ring: "ring-gray-200",
  },
  returned: {
    icon: FaCheckCircle,
    iconColor: "text-emerald-600",
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
  },
};

const NotificationsSection = ({ notificationsApi }) => {
  const { notifications, unreadCount, markRead, markUnread, markAllRead } =
    notificationsApi;
  const [filter, setFilter] = useState("all");

  const visible = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === filter);
  }, [filter, notifications]);

  return (
    <Section
      title="Notifications"
      subtitle="Borrowing alerts and reminders drawn from your activity. Read state stays on this device."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {NOTIF_FILTERS.map((f) => {
            const active = filter === f.id;
            const count =
              f.id === "all"
                ? notifications.length
                : f.id === "unread"
                  ? unreadCount
                  : notifications.filter((n) => n.type === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[#D34F4E] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {f.label}
                <span
                  className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? "bg-white/25" : "bg-white"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="text-xs font-semibold text-[#D34F4E] hover:underline disabled:opacity-50"
        >
          Mark all as read
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 px-6 py-12 text-center">
          <FaBell className="mx-auto text-3xl text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">
            You're all caught up.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((n) => {
            const style = NOTIF_STYLE[n.type] || NOTIF_STYLE.borrowed;
            const Icon = style.icon;
            return (
              <li
                key={n.id}
                className={`flex items-start gap-3 rounded-xl ${style.bg} px-4 py-3 ring-1 ${style.ring}`}
              >
                <span className={`mt-0.5 ${style.iconColor}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      n.read ? "font-normal text-gray-700" : "font-semibold text-gray-900"
                    }`}
                  >
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-600">{n.body}</p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {formatDateTime(n.timestamp)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => (n.read ? markUnread(n.id) : markRead(n.id))}
                  className="text-[11px] font-semibold text-[#D34F4E] hover:underline"
                >
                  {n.read ? "Mark unread" : "Mark read"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
};

const Section = ({ title, subtitle, children, tone }) => (
  <section
    className={`rounded-2xl bg-white p-5 shadow-sm ring-1 sm:p-6 ${
      tone === "danger" ? "ring-red-200/80" : "ring-gray-200/80"
    }`}
  >
    <header className="mb-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </header>
    {children}
  </section>
);

const ActivityCard = ({ label, value, danger, small }) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
      {label}
    </p>
    <p
      className={`mt-1 font-bold ${small ? "text-base" : "text-2xl"} ${
        danger && value > 0 ? "text-red-600" : "text-[#D34F4E]"
      }`}
    >
      {value}
    </p>
  </div>
);

const ConfirmModal = ({
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  onCancel,
  onConfirm,
}) => {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-[44px] flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-60"
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
            className={`min-h-[44px] flex-1 rounded-xl py-2.5 text-sm font-semibold text-white ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[#D34F4E] hover:bg-[#c04544]"
            } disabled:opacity-60`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
