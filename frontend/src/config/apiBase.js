/**
 * API base URL for axios.
 * - Set VITE_API_BASE_URL in .env to override (e.g. http://localhost:4000).
 * - In Vite dev, default is "" so requests use the dev server origin and
 *   vite.config.js proxy forwards /auth, /users, /books, /borrow to the gateway.
 * - In production build, default is the API gateway on 4000 (matches docker-compose).
 */
export function getApiBaseURL() {
  const fromEnv = import.meta.env?.VITE_API_BASE_URL;
  if (fromEnv != null && String(fromEnv).trim() !== "") {
    return String(fromEnv).replace(/\/$/, "");
  }
  if (import.meta.env?.DEV) {
    return "";
  }
  return "http://localhost:4000";
}
