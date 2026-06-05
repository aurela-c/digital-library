import nodemailer from "nodemailer";
import { resolve4 } from "dns/promises";

// Two delivery paths are supported:
//   1) Brevo HTTP API   — set BREVO_API_KEY (recommended on PaaS like Railway
//      where outbound SMTP ports are blocked; uses HTTPS / port 443).
//   2) SMTP via nodemailer — set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
//      (used for local dev and providers that allow SMTP egress).
const BREVO_API_KEY = (process.env.BREVO_API_KEY || "").trim();
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const SMTP_HOST = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE =
  process.env.SMTP_SECURE != null
    ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
    : SMTP_PORT === 465;

let _hostIPv4Promise = null;
function resolveHostIPv4() {
  if (_hostIPv4Promise) return _hostIPv4Promise;
  _hostIPv4Promise = resolve4(SMTP_HOST).then((addrs) => {
    if (!addrs.length) throw new Error(`No IPv4 A record for ${SMTP_HOST}`);
    return addrs[0];
  });
  return _hostIPv4Promise;
}

const APP_NAME = process.env.APP_NAME || "Digital Library";
const DEFAULT_SENDER = "aurelacocaj1@gmail.com";

const senderAddress = () =>
  String(process.env.EMAIL_FROM || process.env.EMAIL_USER || DEFAULT_SENDER).trim();

const smtpUser = () =>
  String(process.env.SMTP_USER || process.env.EMAIL_USER || DEFAULT_SENDER).trim();

const smtpPass = () =>
  String(
    process.env.SMTP_PASS ||
      process.env.EMAIL_APP_PASSWORD ||
      process.env.EMAIL_PASS ||
      ""
  ).replace(/\s+/g, "");

const isDebug = () =>
  String(process.env.EMAIL_DEBUG || "").toLowerCase() === "true";

let _transporter = null;
let _transporterKey = null;

function transporterKey() {
  return `${SMTP_HOST}:${SMTP_PORT}:${smtpUser()}::${smtpPass().slice(0, 4)}`;
}

async function buildTransport() {
  const user = smtpUser();
  const pass = smtpPass();
  const ipv4 = await resolveHostIPv4();

  return nodemailer.createTransport({
    host: ipv4,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    requireTLS: !SMTP_SECURE,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: {
      servername: SMTP_HOST,
      rejectUnauthorized: true,
    },
    logger: isDebug(),
    debug: isDebug(),
  });
}

async function getTransporter() {
  const key = transporterKey();
  if (_transporter && _transporterKey === key) return _transporter;
  _transporter = await buildTransport();
  _transporterKey = key;
  return _transporter;
}

async function sendViaBrevoApi({ from, to, subject, html }) {
  const fromMatch = /^"?([^"<]*)"?\s*<?([^<>\s]+@[^<>\s]+)>?$/.exec(from);
  const fromName = (fromMatch?.[1] || APP_NAME).trim() || APP_NAME;
  const fromEmail = (fromMatch?.[2] || senderAddress()).trim();

  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(
      `Brevo API error ${res.status}: ${body?.message || body?.raw || res.statusText}`
    );
    err.code = body?.code || `HTTP_${res.status}`;
    err.responseCode = res.status;
    err.response = body;
    throw err;
  }

  return {
    messageId: body?.messageId,
    response: `Brevo API ${res.status}`,
    accepted: [to],
    rejected: [],
    envelope: { from: fromEmail, to: [to] },
  };
}

export async function verifyEmailTransport() {
  if (BREVO_API_KEY) {
    console.log(
      `[email] EMAIL READY -> provider=brevo-http-api from=${senderAddress()}`
    );
    return { ok: true, status: "REACHABLE", provider: "brevo-http-api" };
  }
  if (!smtpPass()) {
    console.warn(
      "[email] No email transport configured — emails will be skipped. " +
        "Set BREVO_API_KEY (recommended on Railway) or SMTP_PASS."
    );
    return { ok: true, status: "NOT_CONFIGURED" };
  }
  try {
    const transporter = await getTransporter();
    const info = await transporter.verify();
    console.log(
      `[email] SMTP READY -> user=${smtpUser()} host=${SMTP_HOST}:${SMTP_PORT} (${SMTP_SECURE ? "SMTPS" : "STARTTLS"})`
    );
    return { ok: true, status: "REACHABLE", info };
  } catch (err) {
    console.error("[email] SMTP VERIFY FAILED ->", {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      user: smtpUser(),
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
    });
    return { ok: false, status: `DOWN (${err.code || err.message})` };
  }
}

export const sendEmail = async (to, subject, html) => {
  const from = `"${APP_NAME}" <${senderAddress()}>`;

  console.log("EMAIL SENDING STARTED ->", {
    to,
    subject,
    from,
    provider: BREVO_API_KEY ? "brevo-http-api" : "smtp",
  });

  if (BREVO_API_KEY) {
    try {
      const info = await sendViaBrevoApi({ from, to, subject, html });
      console.log("EMAIL SENT SUCCESS ->", {
        to,
        provider: "brevo-http-api",
        messageId: info.messageId,
        response: info.response,
      });
      return info;
    } catch (err) {
      console.error("EMAIL ERROR (brevo-http-api) ->", {
        to,
        subject,
        message: err.message,
        code: err.code,
        responseCode: err.responseCode,
        response: err.response,
      });
      throw err;
    }
  }

  const pass = smtpPass();
  if (!pass) {
    console.warn(
      "[email] No transport configured — refusing to send. " +
        "Set BREVO_API_KEY or SMTP_PASS in the environment."
    );
    const err = new Error("No email transport configured");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log("EMAIL SENT SUCCESS ->", {
      to,
      provider: "smtp",
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      envelope: info.envelope,
    });
    return info;
  } catch (err) {
    console.error("EMAIL ERROR (smtp) ->", {
      to,
      subject,
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
      stack: err.stack,
    });
    throw err;
  }
};

const layout = ({ title, intro, ctaUrl, ctaLabel, footer }) => `
<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5efe9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5efe9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.06);">
          <tr>
            <td style="background:#D34F4E;padding:20px 24px;color:#ffffff;font-size:18px;font-weight:700;">
              ${APP_NAME}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;font-size:20px;font-weight:700;color:#111827;">
              ${title}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 20px;font-size:14px;line-height:1.6;color:#374151;">
              ${intro}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 28px 28px;">
              <a href="${ctaUrl}"
                 style="display:inline-block;background:#D34F4E;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">
                ${ctaLabel}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;font-size:12px;color:#6b7280;line-height:1.6;">
              If the button does not work, copy and paste this link into your browser:<br/>
              <span style="word-break:break-all;color:#374151;">${ctaUrl}</span>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:16px 28px;font-size:12px;color:#9ca3af;border-top:1px solid #f0f0f0;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const sendVerificationEmail = (to, verifyUrl) =>
  sendEmail(
    to,
    "Verify your email",
    layout({
      title: "Verify your email",
      intro:
        "Welcome! Please confirm your email address to activate your account. This link expires in 24 hours.",
      ctaUrl: verifyUrl,
      ctaLabel: "Verify email",
      footer: "If you did not create an account, you can safely ignore this email.",
    })
  );

export const sendPasswordResetEmail = (to, resetUrl, minutesValid = 60) =>
  sendEmail(
    to,
    "Reset your password",
    layout({
      title: "Reset your password",
      intro: `We received a request to reset your password. This link is valid for ${minutesValid} minutes.`,
      ctaUrl: resetUrl,
      ctaLabel: "Reset password",
      footer:
        "If you did not request a password reset, ignore this email — your password will not change.",
    })
  );

export const sendTestEmail = (to) =>
  sendEmail(
    to,
    `${APP_NAME} — SMTP test`,
    layout({
      title: "SMTP test successful",
      intro:
        "If you can read this, Nodemailer + Gmail SMTP are working correctly from your local environment.",
      ctaUrl: process.env.FRONTEND_URL || "http://localhost:5173",
      ctaLabel: "Open the app",
      footer: `Sent at ${new Date().toISOString()}`,
    })
  );
