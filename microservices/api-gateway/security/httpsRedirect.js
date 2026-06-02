/**
 * httpsRedirect — force HTTP → HTTPS in production.
 *
 * Default behaviour (unchanged): when `NODE_ENV === "production"` and the
 * caller did NOT set `X-Forwarded-Proto: https`, respond with a 301 to the
 * https:// equivalent. This is the right thing when the gateway is the
 * internet-facing entry point and a TLS terminator (Railway / Cloudflare /
 * direct HTTPS listener) sets the header upstream.
 *
 * Opt-out (`DISABLE_HTTPS_REDIRECT`):
 *   In the dockerized stack the gateway sits BEHIND nginx which serves
 *   plain HTTP and forwards `X-Forwarded-Proto: http`. Without this
 *   opt-out the gateway would 301 every request — including its own
 *   HEALTHCHECK — to https://localhost, which has no listener, so the
 *   container ends up marked unhealthy and every browser API call dies.
 *
 *   Setting `DISABLE_HTTPS_REDIRECT=true` (or `1`, `yes`, `on`) skips the
 *   redirect regardless of NODE_ENV, which is the safe choice whenever
 *   another layer is responsible for TLS (nginx in compose, a service
 *   mesh, a load balancer that terminates TLS without setting
 *   X-Forwarded-Proto, etc.).
 *
 *   Leaving the variable unset preserves the legacy production behaviour
 *   so deploys to Railway / similar PaaS are unaffected.
 */

const truthy = (v) => {
  const flag = String(v ?? "").toLowerCase().trim();
  return flag === "true" || flag === "1" || flag === "yes" || flag === "on";
};

const REDIRECT_DISABLED = truthy(process.env.DISABLE_HTTPS_REDIRECT);

// One-shot startup log so the operator can see at a glance whether the
// redirect is active. Helpful when debugging "why does my /health 301?".
if (process.env.NODE_ENV === "production") {
  // eslint-disable-next-line no-console
  console.log(
    REDIRECT_DISABLED
      ? "[security] httpsRedirect DISABLED via DISABLE_HTTPS_REDIRECT — assuming a TLS terminator in front (e.g. nginx)."
      : "[security] httpsRedirect ENABLED — non-https requests will be 301'd. Set DISABLE_HTTPS_REDIRECT=true if a proxy already handles TLS."
  );
}

export const httpsRedirect = (req, res, next) => {
  if (REDIRECT_DISABLED) return next();

  if (process.env.NODE_ENV === "production") {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect("https://" + req.headers.host + req.url);
    }
  }
  next();
};
