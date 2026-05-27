import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";

/** Align with backend: "admin", "ROLE_ADMIN", "Admin" → admin */
export function normalizeRoleKey(role) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/^role_/, "");
}

export function isAdminRole(role) {
  return normalizeRoleKey(role) === "admin";
}

export function roleFromToken(decoded, user) {
  return decoded?.role ?? user?.role ?? "";
}

/**
 * Read the current user's role from localStorage / JWT.
 * Returns "" when there's no session.
 */
export function readCurrentRole() {
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    if (stored?.role) return stored.role;
  } catch {
    /* ignore */
  }
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return "";
    return jwtDecode(token)?.role || "";
  } catch {
    return "";
  }
}

/**
 * React hook: returns `true` when the active session belongs to an
 * admin. Re-checks whenever localStorage changes (cross-tab support).
 */
export function useIsAdmin() {
  const [admin, setAdmin] = useState(() => isAdminRole(readCurrentRole()));

  useEffect(() => {
    const sync = () => setAdmin(isAdminRole(readCurrentRole()));
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return admin;
}
