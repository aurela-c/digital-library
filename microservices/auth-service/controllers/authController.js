import { authService } from "../services/authService.js";
import { sendTestEmail, verifyEmailTransport } from "../utils/emailService.js";

const mapErr = (err, res) => {
  const status = err.status || 500;
  const safeMessage =
    status >= 500 && process.env.NODE_ENV === "production"
      ? "Server error"
      : err.message || "Server error";
  // Provide BOTH `error` (legacy) and `message` (current spec) so any frontend works.
  const payload = {
    success: false,
    error: safeMessage,
    message: safeMessage,
    ...(err.code ? { code: err.code } : {}),
  };
  return res.status(status).json(payload);
};

const wantsHtml = (req) => {
  const accept = String(req.headers?.accept || "").toLowerCase();
  if (req.query?.json === "1") return false;
  return accept.includes("text/html");
};

const frontendBase = () =>
  (process.env.FRONTEND_URL || process.env.FRONTEND_APP_URL || "http://localhost:5173")
    .replace(/\/$/, "");

const htmlPage = ({ title, heading, message, accent = "#16a34a", ctaUrl, ctaLabel }) => `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{margin:0;background:#f5efe9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
    .card{background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.08);max-width:480px;width:100%;padding:32px 28px;text-align:center;}
    h1{margin:0 0 6px;font-size:22px;color:${accent};}
    p{margin:8px 0 20px;font-size:15px;line-height:1.55;color:#374151;}
    a.btn{display:inline-block;background:#D34F4E;color:#fff;text-decoration:none;font-weight:600;padding:10px 20px;border-radius:10px;}
  </style>
</head>
<body>
  <div class="card">
    <h1>${heading}</h1>
    <p>${message}</p>
    ${ctaUrl ? `<a class="btn" href="${ctaUrl}">${ctaLabel || "Continue"}</a>` : ""}
  </div>
</body>
</html>`;

export const register = async (req, res) => {
  try {
    const { status, body } = await authService.register(req.body || {});
    return res.status(status).json(body);
  } catch (err) {
    return mapErr(err, res);
  }
};

export const login = async (req, res) => {
  try {
    if (process.env.DEBUG_AUTH === "true") {
      console.log("[auth] POST /auth/login", { email: req.body?.email });
    }
    const { status, body } = await authService.login(req.body || {});
    return res.status(status).json(body);
  } catch (err) {
    if (process.env.DEBUG_AUTH === "true") {
      console.error("[auth] login error", err.message);
    }
    return mapErr(err, res);
  }
};

export const refresh = async (req, res) => {
  try {
    const { status, body } = await authService.refresh(req.body || {});
    return res.status(status).json(body);
  } catch (err) {
    return mapErr(err, res);
  }
};

export const logout = async (req, res) => {
  try {
    const { status, body } = await authService.logout(req.body || {});
    if (status === 204) {
      return res.sendStatus(204);
    }
    return res.status(status).json(body);
  } catch (err) {
    return mapErr(err, res);
  }
};

export const getUserById = async (req, res) => {
  try {
    const { status, body } = await authService.getUserById(req.user, req.params.id);
    return res.status(status).json(body);
  } catch (err) {
    return mapErr(err, res);
  }
};

// ---------- profile self-service (require auth) ----------

const meId = (req) => req.user?.id ?? req.user?.sub;

export const updateMyProfile = async (req, res) => {
  try {
    const { status, body } = await authService.updateProfile(
      meId(req),
      req.body || {}
    );
    return res.status(status).json(body);
  } catch (err) {
    return mapErr(err, res);
  }
};

export const changeMyPassword = async (req, res) => {
  try {
    const { status, body } = await authService.changePassword(
      meId(req),
      req.body || {}
    );
    return res.status(status).json(body);
  } catch (err) {
    return mapErr(err, res);
  }
};

export const deleteMyAccount = async (req, res) => {
  try {
    const { status, body } = await authService.deleteAccount(
      meId(req),
      req.body || {}
    );
    return res.status(status).json(body);
  } catch (err) {
    return mapErr(err, res);
  }
};

/**
 * GET /auth/me/session — describes the CURRENT access token + request metadata.
 * No DB-backed sessions table, so this only shows the bearer that signed this
 * request (plus the IP and User-Agent it came from).
 */
export const getMySession = (req, res) => {
  const ipRaw =
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "";
  const ip = String(ipRaw).split(",")[0].trim() || null;

  const exp = Number(req.user?.exp) || null;
  const iat = Number(req.user?.iat) || null;

  return res.json({
    success: true,
    session: {
      userId: meId(req),
      issuedAt: iat ? new Date(iat * 1000).toISOString() : null,
      expiresAt: exp ? new Date(exp * 1000).toISOString() : null,
      ip,
      userAgent: req.headers["user-agent"] || null,
    },
  });
};

/**
 * POST /auth/me/logout-all — best-effort sign-out signal.
 *
 * NOTE: this project uses stateless refresh JWTs (no refresh-token table),
 * so we cannot revoke OTHER devices server-side without a schema change.
 * We respond OK so the client can clear its own storage. A "real" global
 * invalidation would need a `tokens_valid_after` column on users.
 */
export const logoutAllDevices = (req, res) => {
  const id = meId(req);
  console.log(`[auth] logout-all requested -> userId=${id} (best-effort)`);
  return res.json({
    success: true,
    message: "Signed out on this device.",
    note: "Other active sessions will expire automatically when their access tokens expire.",
  });
};

export const verifyEmail = async (req, res) => {
  const token = req.query?.token || req.params?.token;

  // If a browser is opening the legacy backend link directly, hand the user
  // off to the frontend page so they get the full UX (success screen + auto-login).
  if (wantsHtml(req)) {
    console.log("[verifyEmail] browser hit -> redirecting to frontend success page");
    if (!token) {
      return res.redirect(302, `${frontendBase()}/login`);
    }
    return res.redirect(
      302,
      `${frontendBase()}/verify-email?token=${encodeURIComponent(token)}`
    );
  }

  // API/JSON callers (e.g. the new frontend page) get the full payload back,
  // including auto-login tokens.
  try {
    const { status, body } = await authService.verifyEmail(token);
    console.log("[verifyEmail] success ->", {
      hasAccessToken: !!body.accessToken,
      hasRefreshToken: !!body.refreshToken,
      hasUser: !!body.user,
      message: body.message,
    });
    return res.status(status).json(body);
  } catch (err) {
    return mapErr(err, res);
  }
};

export const requestReset = async (req, res) => {
  try {
    const { status, body } = await authService.requestReset(req.body || {});
    return res.status(status).json(body);
  } catch (err) {
    return mapErr(err, res);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const body = req.body || {};
    const token = body.token || req.params?.token || req.query?.token;
    const { status, body: respBody } = await authService.resetPassword(token, body);
    return res.status(status).json(respBody);
  } catch (err) {
    return mapErr(err, res);
  }
};

/**
 * Browser-friendly GET handler for the email link
 *   GET /auth/reset-password?token=XXX
 * Redirects to the frontend reset form so the user can enter a new password.
 */
export const resetPasswordRedirect = (req, res) => {
  const token = req.query?.token;
  if (!token) {
    return res.status(400).type("html").send(
      htmlPage({
        title: "Invalid reset link",
        heading: "Invalid reset link",
        message: "This reset link is missing a token.",
        accent: "#dc2626",
        ctaUrl: `${frontendBase()}/forgot-password`,
        ctaLabel: "Request a new link",
      })
    );
  }
  return res.redirect(302, `${frontendBase()}/reset-password/${encodeURIComponent(token)}`);
};

/**
 * POST /auth/test-email
 * Sends a simple HTML email to verify Gmail SMTP works independently of
 * the register / forgot-password flows. Body: { to: "user@example.com" }.
 *
 * Also performs a SMTP `verify()` so we report the precise failure reason
 * (auth failure, network, missing app password, …) instead of a generic 500.
 */
export const testEmail = async (req, res) => {
  const to = (req.body?.to || "").trim();
  if (!to) {
    return res.status(400).json({
      success: false,
      message: "Field `to` is required (recipient email).",
    });
  }

  try {
    const probe = await verifyEmailTransport();
    if (probe.status === "NOT_CONFIGURED") {
      return res.status(500).json({
        success: false,
        code: "EMAIL_NOT_CONFIGURED",
        message:
          "EMAIL_APP_PASSWORD is not set. Add it to microservices/auth-service/.env and restart auth-service.",
      });
    }
    if (!probe.ok) {
      return res.status(502).json({
        success: false,
        code: "SMTP_DOWN",
        message: `SMTP not reachable: ${probe.status}`,
      });
    }

    const info = await sendTestEmail(to);
    return res.status(200).json({
      success: true,
      message: `Test email sent to ${to}`,
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: err.code || "EMAIL_SEND_FAILED",
      message: err.message || "Failed to send test email",
      smtpResponse: err.response,
      smtpResponseCode: err.responseCode,
    });
  }
};
