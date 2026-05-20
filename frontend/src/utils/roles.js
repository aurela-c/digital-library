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
