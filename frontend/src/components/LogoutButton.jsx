import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiX } from "react-icons/fi";
import { AuthContext } from "../../context/AuthContext.jsx";

/**
 * Single source of truth for logging out across the app.
 *
 * Why a shared component:
 *   1. Calling `AuthContext.logout()` alone clears storage + state but
 *      does NOT navigate. The route guards (ProtectedRoute / AdminRoute)
 *      check `localStorage.getItem("accessToken")` at MOUNT time only
 *      and don't subscribe to storage changes, so the user stayed on
 *      the same page until they manually refreshed. We fix that here
 *      by always doing `navigate("/login", { replace: true })` AFTER
 *      `logout()` settles — the user is taken to the login screen
 *      immediately, no refresh required.
 *
 *   2. Every logout entry-point (admin sidebar, user profile sidebar,
 *      mobile burger menu, …) needs the same confirmation dialog and
 *      the same redirect behaviour. Centralising it here means there
 *      is exactly one place to update the copy, behaviour, or styling.
 *
 * Props:
 *   - `className`        — Tailwind classes for the trigger button.
 *   - `iconClassName`    — Tailwind classes for the leading icon.
 *   - `label`            — Button copy. Defaults to "Log out".
 *   - `showIcon`         — Set to false to hide the icon entirely.
 *   - `confirmTitle`     — Heading shown in the confirmation modal.
 *   - `confirmMessage`   — Body shown in the confirmation modal.
 *   - `onAfterLogout`    — Optional hook fired after navigation (rare).
 */
const LogoutButton = ({
  className,
  iconClassName,
  label = "Log out",
  showIcon = true,
  confirmTitle = "Log out?",
  confirmMessage = "Are you sure you want to log out?",
  onAfterLogout,
}) => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      // logout() awaits the backend /auth/logout call. We deliberately
      // still navigate even when that promise rejects — the user clicked
      // "Log out", their intent is clear, and the local session has
      // already been wiped by the time we land in the `finally` block.
      await logout();
    } catch {
      /* swallow network errors — local session is already cleared */
    } finally {
      setBusy(false);
      setConfirming(false);
      // `replace: true` so the user can't press Back to land on a
      // protected page after logout.
      navigate("/login", { replace: true });
      if (typeof onAfterLogout === "function") {
        onAfterLogout();
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={className}
      >
        {showIcon && <FiLogOut className={iconClassName || "h-4 w-4"} />}
        {label}
      </button>

      {confirming && (
        <LogoutConfirmDialog
          title={confirmTitle}
          message={confirmMessage}
          busy={busy}
          onCancel={() => {
            if (!busy) setConfirming(false);
          }}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
};

/**
 * Rendered through `createPortal` straight into `document.body` so the
 * modal escapes any ancestor stacking context (the Profile sidebar uses
 * `lg:sticky`, which traps `position: fixed` z-indexes locally — without
 * a portal, borrowed-book cards in a sibling grid would paint on top of
 * the dialog regardless of how high its z-index is). Also locks page
 * scroll while open so the background can't drift behind the modal.
 */
const LogoutConfirmDialog = ({ title, message, busy, onCancel, onConfirm }) => {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-confirm-title"
    >
      {/* Backdrop is intentionally near-opaque (with a heavy blur) so
          background content — borrowed-book lists, reading stats, etc.
          on the Profile page — is fully obscured behind the confirmation
          dialog. A translucent backdrop would let those panels show
          through and visually "leak" into the logout form, which users
          consistently read as the modal containing irrelevant data. */}
      <div
        className="absolute inset-0 bg-gray-900/85 backdrop-blur-md"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h3
            id="logout-confirm-title"
            className="text-lg font-bold text-gray-900"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D34F4E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c04544] disabled:opacity-60"
          >
            {busy ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LogoutButton;
