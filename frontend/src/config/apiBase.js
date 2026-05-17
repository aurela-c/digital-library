function normalizeGatewayBase(raw) {
  let base = String(raw).trim().replace(/\/+$/, "");
  // Gateway mounts HTTP routes at /auth, /users, ... not under /api.
  if (/\/api$/i.test(base)) {
    base = base.replace(/\/api$/i, "").replace(/\/+$/, "");
  }
  return base;
}

/**
 * API base URL for axios. Production builds require VITE_GATEWAY_TARGET.
 * In local dev, an empty string uses the Vite dev-server proxy.
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

  if (import.meta.env?.DEV) {
    return "";
  }

  throw new Error(
    "VITE_GATEWAY_TARGET must be set for production builds (Netlify: Site settings → Environment variables)."
  );
}
