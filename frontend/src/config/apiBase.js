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

  // fallback for local dev if env missing
  return "http://localhost:4000";
}