import nodemailer from "nodemailer";

function buildTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Health check: verify SMTP credentials when configured.
 */
export async function verifyEmailTransport() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { ok: true, status: "NOT_CONFIGURED" };
  }
  const transporter = buildTransport();
  await transporter.verify();
  return { ok: true, status: "REACHABLE" };
}

export const sendEmail = async (to, subject, html) => {
  try {
    const transporter = buildTransport();
    await transporter.sendMail({
      from: `"Digital Library" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
};
