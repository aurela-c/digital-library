export const ROLES = Object.freeze({
  ADMIN: "ROLE_ADMIN",
  USER: "ROLE_USER",
  LIBRARIAN: "ROLE_LIBRARIAN",
});

/** "ROLE_USER", "user", "User" → "user" for consistent role checks */
export function normalizeRoleKey(role) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/^role_/, "");
}

/** Map DB/JWT variants to canonical ROLE_* values */
export function toCanonicalRole(role) {
  const key = normalizeRoleKey(role);
  if (key === "admin") return ROLES.ADMIN;
  if (key === "user") return ROLES.USER;
  if (key === "librarian") return ROLES.LIBRARIAN;
  const trimmed = String(role ?? "").trim();
  return trimmed || ROLES.USER;
}

export function isAdminRole(role) {
  return normalizeRoleKey(role) === "admin";
}

/**
 * Roles allowed to use the borrow flow (POST /borrow, PUT /return/:id).
 *
 * Admins are intentionally EXCLUDED: admins manage the library, they
 * do not consume it. Any admin token hitting these routes is rejected
 * by `allowRoles(...)` with a 403, mirroring the frontend which hides
 * the borrow controls for admin sessions.
 *
 * Librarians keep borrow/return access because they may need to return
 * items on behalf of users from internal tooling.
 */
export const BORROW_ACTOR_ROLES = [ROLES.USER, ROLES.LIBRARIAN];

export const STAFF_BOOK_ROLES = [ROLES.ADMIN, ROLES.LIBRARIAN];
