import nodemailer from "nodemailer";
import { lookup as dnsLookup } from "dns";

const ipv4OnlyLookup = (hostname, options, callback) => {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  return dnsLookup(hostname, { ...(options || {}), family: 4 }, callback);
};

const APP_NAME = process.env.APP_NAME || "Digital Library";
const DEFAULT_SENDER = "aurelacocaj1@gmail.com";

const senderAddress = () =>
  String(process.env.EMAIL_USER || DEFAULT_SENDER).trim();

const senderPassword = () =>
  String(process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS || "")
    .replace(/\s+/g, "");

const isDebug = () =>
  String(process.env.EMAIL_DEBUG || "").toLowerCase() === "true";

let _transporter = null;
let _transporterKey = null;

function transporterKey() {
  return `${senderAddress()}::${senderPassword().slice(0, 4)}`;
}

function buildTransport() {
  const user = senderAddress();
  const pass = senderPassword();

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,        
    requireTLS: true,    
    auth: { user, pass },
    lookup: ipv4OnlyLookup,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: { rejectUnauthorized: true },
    logger: isDebug(),
    debug: isDebug(),
  });
}

function getTransporter() {
  const key = transporterKey();
  if (_transporter && _transporterKey === key) return _transporter;
  _transporter = buildTransport();
  _transporterKey = key;
  return _transporter;
}

export async function verifyEmailTransport() {
  if (!senderPassword()) {
    console.warn(
      "[email] EMAIL_APP_PASSWORD is NOT set — emails will be skipped. " +
        "Set it in microservices/auth-service/.env"
    );
    return { ok: true, status: "NOT_CONFIGURED" };
  }
  try {
    const info = await getTransporter().verify();
    console.log(
      `[email] SMTP READY -> user=${senderAddress()} host=smtp.gmail.com:587 (STARTTLS)`
    );
    return { ok: true, status: "REACHABLE", info };
  } catch (err) {
    console.error("[email] SMTP VERIFY FAILED ->", {
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
  const pass = senderPassword();

  console.log("EMAIL SENDING STARTED ->", { to, subject, from });

  if (!pass) {
    console.warn(
      "[email] EMAIL_APP_PASSWORD missing — refusing to send. " +
        "Add EMAIL_APP_PASSWORD=<gmail-app-password> to auth-service/.env"
    );
    const err = new Error("EMAIL_APP_PASSWORD is not configured");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  try {
    const info = await getTransporter().sendMail({ from, to, subject, html });
    console.log("EMAIL SENT SUCCESS ->", {
      to,
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      envelope: info.envelope,
    });
    return info;
  } catch (err) {
    console.error("EMAIL ERROR ->", {
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
