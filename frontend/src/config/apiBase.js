function normalizeGatewayBase(raw) {
  let base = String(raw).trim().replace(/\/+$/, "");

  // Gateway mounts HTTP routes at /auth, /users, etc.
  if (/\/api$/i.test(base)) {
    base = base.replace(/\/api$/i, "").replace(/\/+$/, "");
  }

  return base;
}

/**
 * API base URL for axios.
 * Production builds require VITE_GATEWAY_TARGET.
 * Local development uses localhost auth-service directly.
 */
export function getApiBaseURL() {
  const gateway = import.meta.env?.VITE_GATEWAY_TARGET;

  if (gateway != null && String(gateway).trim() !== "") {
    return normalizeGatewayBase(gateway);
  }

  const legacy = import.meta.env?.VITE_API_BASE_URL;

  if (legacy != null && String(legacy).trim() !== "") {
    return normalizeGatewayBase(legacy);
  }

  // Local development fallback
  if (import.meta.env?.DEV) {
    return "http://localhost:5001";
  }

  throw new Error(
    "VITE_GATEWAY_TARGET must be set for production builds (Netlify: Site settings → Environment variables)."
  );
}