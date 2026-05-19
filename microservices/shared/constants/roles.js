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

export const BORROW_ACTOR_ROLES = [
  ROLES.USER,
  ROLES.ADMIN,
  ROLES.LIBRARIAN,
];

export const STAFF_BOOK_ROLES = [ROLES.ADMIN, ROLES.LIBRARIAN];
