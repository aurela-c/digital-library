export function getApiBaseURL() {
  const fromEnv = import.meta.env?.VITE_API_BASE_URL;
  if (fromEnv != null && String(fromEnv).trim() !== "") {
    let base = String(fromEnv).trim().replace(/\/+$/, "");
    // Gateway mounts HTTP routes at /auth, /users, ... not under /api. A base URL
    // ending in /api would make axios combine to /api/auth/login → 404.
    if (/\/api$/i.test(base)) {
      base = base.replace(/\/api$/i, "").replace(/\/+$/, "");
    }
    return base;
  }
  if (import.meta.env?.DEV) {
    return "";
  }
  return "http://localhost:4000";
}
