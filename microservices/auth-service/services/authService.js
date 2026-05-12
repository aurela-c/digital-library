import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { userRepository } from "../repositories/userRepository.js";
import { refreshTokenRepository } from "../repositories/refreshTokenRepository.js";
import { sendEmail } from "../utils/emailService.js";
import { auditLog } from "../utils/auditLog.js";

const isProd = process.env.NODE_ENV === "production";

const ACCESS_SECRET = process.env.ACCESS_SECRET || "ACCESS_SECRET_KEY";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "REFRESH_SECRET_KEY";

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "1h";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const shouldSkipEmailVerification = () => {
  const explicit = String(process.env.AUTH_SKIP_EMAIL_VERIFY || "").toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return !isProd;
};

const frontendAppBase = () =>
  (process.env.FRONTEND_APP_URL || "http://localhost:5173").replace(/\/$/, "");

const accessPayload = (user) => ({
  sub: String(user.id),
  id: user.id,
  userId: user.id,
  email: user.email,
  role: user.role || "ROLE_USER",
  typ: "access",
});

const signAccessToken = (user) =>
  jwt.sign(accessPayload(user), ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });

const refreshTtlMs = () => {
  const match = /^(\d+)([dhms])$/i.exec(String(REFRESH_EXPIRES_IN).trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const u = match[2].toLowerCase();
  const mult =
    u === "d" ? 86400000 : u === "h" ? 3600000 : u === "m" ? 60000 : 1000;
  return n * mult;
};

const issueRefreshToken = async (user) => {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + refreshTtlMs());
  await refreshTokenRepository.create({
    userId: user.id,
    jti,
    expiresAt,
  });
  const refreshToken = jwt.sign(
    {
      sub: String(user.id),
      userId: user.id,
      jti,
      typ: "refresh",
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
  return refreshToken;
};

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage ?? null,
  accountStatus: user.accountStatus ?? "ACTIVE",
});

export const authService = {
  async register({ name, email, password }) {
    if (!name || !email || !password) {
      const err = new Error("All fields are required");
      err.status = 400;
      throw err;
    }

    const exists = await userRepository.findByEmail(email);
    if (exists) {
      const err = new Error("Email already exists");
      err.status = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const skipVerify = shouldSkipEmailVerification();

    await userRepository.create({
      username: name,
      email,
      password: hashedPassword,
      role: "ROLE_USER",
      isVerified: skipVerify,
      verificationToken: skipVerify ? null : verificationToken,
      accountStatus: "ACTIVE",
    });

    if (!skipVerify) {
      const verifyUrl = `${frontendAppBase()}/verify/${verificationToken}`;
      try {
        await sendEmail(
          email,
          "Verify your account",
          `<p>Welcome to Digital Library.</p><p><a href="${verifyUrl}">Verify your account</a></p>`
        );
      } catch (err) {
        console.error("EMAIL ERROR:", err.message);
      }
    }

    auditLog({
      action: "REGISTER",
      email,
      meta: { skipVerify },
    });

    return {
      status: 201,
      body: {
        message: skipVerify
          ? "User registered. You can log in now."
          : "User registered. Check email to verify account.",
      },
    };
  },

  async login({ email, password }) {
    if (!email || !password) {
      const err = new Error("Email & password required");
      err.status = 400;
      throw err;
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      const err = new Error("Invalid credentials");
      err.status = 400;
      throw err;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      auditLog({ action: "LOGIN_FAILED", email });
      const err = new Error("Invalid credentials");
      err.status = 400;
      throw err;
    }

    if (!user.isVerified) {
      const err = new Error("Verify your email first");
      err.status = 403;
      throw err;
    }

    const status = String(user.accountStatus || "ACTIVE").toUpperCase();
    if (status === "BANNED") {
      const err = new Error("Account suspended");
      err.status = 403;
      throw err;
    }
    if (status === "INACTIVE") {
      const err = new Error("Account inactive");
      err.status = 403;
      throw err;
    }

    await refreshTokenRepository.revokeAllActiveForUser(user.id);

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user);

    auditLog({ action: "LOGIN_OK", userId: user.id, email: user.email });

    return {
      status: 200,
      body: {
        accessToken,
        refreshToken,
        user: publicUser(user),
      },
    };
  },

  async refresh({ token: refreshToken }) {
    if (!refreshToken) {
      const err = new Error("No refresh token");
      err.status = 401;
      err.code = "NO_REFRESH_TOKEN";
      throw err;
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (e) {
      const err = new Error("Invalid refresh token");
      err.status = 403;
      err.code = "REFRESH_INVALID";
      throw err;
    }

    if (decoded.typ !== "refresh" || !decoded.jti) {
      const err = new Error("Invalid refresh token");
      err.status = 403;
      err.code = "REFRESH_INVALID";
      throw err;
    }

    const row = await refreshTokenRepository.findValidByJti(decoded.jti);
    if (!row || String(row.userId) !== String(decoded.sub)) {
      const err = new Error("Invalid refresh token");
      err.status = 403;
      err.code = "REFRESH_INVALID";
      throw err;
    }

    const user = await userRepository.findByPk(row.userId);
    if (!user) {
      const err = new Error("Invalid refresh token");
      err.status = 403;
      err.code = "REFRESH_INVALID";
      throw err;
    }

    await refreshTokenRepository.revokeByJti(decoded.jti);

    const accessToken = signAccessToken(user);
    const newRefresh = await issueRefreshToken(user);

    auditLog({ action: "TOKEN_REFRESH", userId: user.id });

    return {
      status: 200,
      body: { accessToken, refreshToken: newRefresh },
    };
  },

  async logout(body = {}) {
    const refreshToken = body.refreshToken ?? body.token;
    if (!refreshToken) {
      return { status: 204, body: null };
    }
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
      if (decoded.jti) {
        await refreshTokenRepository.revokeByJti(decoded.jti);
        auditLog({ action: "LOGOUT", userId: decoded.sub });
      }
    } catch {
      /* ignore invalid token on logout */
    }
    return { status: 204, body: null };
  },

  async getUserById(requestingUser, id) {
    if (
      String(requestingUser.role) !== "ROLE_ADMIN" &&
      String(requestingUser.id ?? requestingUser.sub) !== String(id)
    ) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }

    const user = await userRepository.findByPk(id);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    return { status: 200, body: publicUser(user) };
  },

  async verifyEmail(token) {
    const user = await userRepository.findByVerificationToken(token);
    if (!user) {
      const err = new Error("Invalid token");
      err.status = 400;
      throw err;
    }
    user.isVerified = true;
    user.verificationToken = null;
    await user.save();
    auditLog({ action: "EMAIL_VERIFIED", userId: user.id });
    return { status: 200, body: { message: "Email verified successfully" } };
  },

  async requestReset({ email }) {
    if (!email) {
      const err = new Error("Email required");
      err.status = 400;
      throw err;
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return { status: 200, body: { message: "If exists, email sent" } };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${frontendAppBase()}/reset-password/${resetToken}`;
    try {
      await sendEmail(
        email,
        "Reset your password",
        `<p>Click to reset your password (valid 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
      );
    } catch (err) {
      console.error("RESET EMAIL ERROR:", err.message);
    }

    auditLog({ action: "PASSWORD_RESET_REQUEST", email });
    return { status: 200, body: { message: "Reset email sent" } };
  },

  async resetPassword(token, { password }) {
    if (!password) {
      const err = new Error("Password required");
      err.status = 400;
      throw err;
    }

    const user = await userRepository.findByResetToken(token);
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
      const err = new Error("Invalid or expired token");
      err.status = 400;
      throw err;
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await refreshTokenRepository.revokeAllActiveForUser(user.id);

    auditLog({ action: "PASSWORD_RESET_COMPLETE", userId: user.id });
    return { status: 200, body: { message: "Password reset successful" } };
  },
};
