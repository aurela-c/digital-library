function normalizeGatewayBase(raw) {
  let base = String(raw).trim().replace(/\/+$/, "");

  if (/\/api$/i.test(base)) {
    base = base.replace(/\/api$/i, "").replace(/\/+$/, "");
  }

  return base;
}

/**
 * API base URL for axios.
 * Uses API Gateway (no direct microservice calls).
 */
export function getApiBaseURL() {
  const gateway = import.meta.env?.VITE_GATEWAY_TARGET;

  // PRIMARY: gateway (production + local)
  if (gateway != null && String(gateway).trim() !== "") {
    return normalizeGatewayBase(gateway);
  }

  // Production builds MUST have VITE_GATEWAY_TARGET (set on Netlify).
  // Local dev keeps the localhost fallback below.
  if (import.meta.env?.PROD) {
    throw new Error(
      "VITE_GATEWAY_TARGET must be set for production builds (Netlify env)."
    );
  }

  // fallback for local dev only
  return "http://localhost:4000";
}