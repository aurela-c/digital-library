
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
