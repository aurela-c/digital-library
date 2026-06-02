import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { userRepository } from "../repositories/userRepository.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/emailService.js";
import { auditLog } from "../utils/auditLog.js";
import { getSecret } from "../../observability/config/secrets.js";
import { isAdminRole, toCanonicalRole } from "../../shared/constants/roles.js";

const isProd = process.env.NODE_ENV === "production";

const ACCESS_SECRET = getSecret("ACCESS_SECRET", "ACCESS_SECRET_KEY");
const REFRESH_SECRET = getSecret("REFRESH_SECRET", "REFRESH_SECRET_KEY");

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "1h";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// Reset token TTL — 1 hour per spec, override via env.
const RESET_TOKEN_TTL_MS =
  Number(process.env.PASSWORD_RESET_EXPIRES_MS) || 60 * 60 * 1000;

// Verification JWT TTL — 24 hours (expiry is encoded in the JWT itself,
// so no extra DB column is required).
const VERIFICATION_TOKEN_TTL = process.env.VERIFICATION_TOKEN_TTL || "24h";

// Verification is REQUIRED by default in every environment.
// Only skipped when explicitly opted-out via AUTH_SKIP_EMAIL_VERIFY=true.
const shouldSkipEmailVerification = () =>
  String(process.env.AUTH_SKIP_EMAIL_VERIFY || "").toLowerCase() === "true";

const backendBase = () =>
  (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`)
    .replace(/\/$/, "");

const frontendBase = () =>
  (process.env.FRONTEND_URL || process.env.FRONTEND_APP_URL || "http://localhost:5173")
    .replace(/\/$/, "");

// Email link points to a frontend PAGE so the user lands in a real UI,
// not a raw backend response. The page then calls the backend verify endpoint
// and auto-logs the user in.
const buildVerifyUrl = (token) =>
  `${frontendBase()}/verify-email?token=${encodeURIComponent(token)}`;

const buildResetUrl = (token) =>
  `${backendBase()}/auth/reset-password?token=${encodeURIComponent(token)}`;

/** Sign a short-lived verification JWT. The string is stored in users.verification_token. */
const signVerificationToken = (user) =>
  jwt.sign(
    { sub: String(user.id), email: user.email, typ: "verify" },
    ACCESS_SECRET,
    { expiresIn: VERIFICATION_TOKEN_TTL }
  );

const accessPayload = (user) => ({
  sub: String(user.id),
  id: user.id,
  userId: user.id,
  email: user.email,
  role: toCanonicalRole(user.role),
  typ: "access",
});

const signAccessToken = (user) =>
  jwt.sign(accessPayload(user), ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });

/** Stateless refresh JWT (no separate refresh-token table). */
const issueRefreshToken = (user) => {
  const jti = crypto.randomUUID();
  return jwt.sign(
    {
      sub: String(user.id),
      userId: user.id,
      jti,
      typ: "refresh",
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
};

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: toCanonicalRole(user.role),
  profileImage: user.profileImage ?? null,
  accountStatus: user.accountStatus ?? "ACTIVE",
});

export const authService = {
  async register({ name, email, password }) {
    console.log("REGISTER FLOW HIT ->", { email });

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
    const skipVerify = shouldSkipEmailVerification();

    const createdUser = await userRepository.create({
      username: name,
      email,
      password: hashedPassword,
      role: "ROLE_USER",
      isVerified: skipVerify,
      verificationToken: null,
      accountStatus: "ACTIVE",
    });

    if (!skipVerify) {
      const verificationToken = signVerificationToken(createdUser);
      createdUser.verificationToken = verificationToken;
      await createdUser.save();

      try {
        await sendVerificationEmail(email, buildVerifyUrl(verificationToken));
        console.log("EMAIL SENT -> verification ->", email);
      } catch (err) {
        // Email failure must not break registration — user can retry verification.
        console.error(`EMAIL ERROR: registration verify email -> ${err.message}`);
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
        success: true,
        message: skipVerify
          ? "User registered. You can log in now."
          : "Check your email to verify your account",
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

    console.log("LOGIN ATTEMPT USER VERIFIED STATUS ->", {
      email,
      is_verified: !!user.isVerified,
    });

    if (!user.isVerified) {
      const err = new Error("Please verify your email before logging in");
      err.status = 403;
      err.code = "EMAIL_NOT_VERIFIED";
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

    const accessToken = signAccessToken(user);
    const refreshToken = issueRefreshToken(user);

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
    } catch {
      const err = new Error("Invalid refresh token");
      err.status = 403;
      err.code = "REFRESH_INVALID";
      throw err;
    }

    if (decoded.typ !== "refresh") {
      const err = new Error("Invalid refresh token");
      err.status = 403;
      err.code = "REFRESH_INVALID";
      throw err;
    }

    const userId = decoded.sub ?? decoded.userId;
    const user = await userRepository.findByPk(userId);
    if (!user) {
      const err = new Error("Invalid refresh token");
      err.status = 403;
      err.code = "REFRESH_INVALID";
      throw err;
    }

    // Enforce account state at refresh time. Without this, a banned or
    // deactivated user could indefinitely extend their session by
    // refreshing — the access-token check at login wouldn't matter,
    // because they'd never need to log in again.
    //
    // With this in place, the worst-case lock-out delay after an admin
    // bans a user is one access-token TTL (default 1h): the live token
    // keeps working until it expires, but the next refresh is rejected
    // and the user is forced back to /login (which then 403s on the
    // login flow).
    const status = String(user.accountStatus || "ACTIVE").toUpperCase();
    if (status === "BANNED") {
      auditLog({ action: "REFRESH_DENIED_BANNED", userId: user.id });
      const err = new Error("Account suspended");
      err.status = 403;
      err.code = "ACCOUNT_BANNED";
      throw err;
    }
    if (status === "INACTIVE") {
      auditLog({ action: "REFRESH_DENIED_INACTIVE", userId: user.id });
      const err = new Error("Account inactive");
      err.status = 403;
      err.code = "ACCOUNT_INACTIVE";
      throw err;
    }

    const accessToken = signAccessToken(user);
    const newRefresh = issueRefreshToken(user);

    auditLog({ action: "TOKEN_REFRESH", userId: user.id });

    return {
      status: 200,
      body: { accessToken, refreshToken: newRefresh },
    };
  },

  async logout() {
    return { status: 204, body: null };
  },

  async updateProfile(userId, { username, profileImage }) {
    console.log(`[authService] updateProfile -> userId=${userId}`);
    if (!userId) {
      const err = new Error("Not authenticated");
      err.status = 401;
      throw err;
    }

    const user = await userRepository.findByPk(userId);
    console.log(
      `[authService] updateProfile DB lookup -> userId=${userId} found=${!!user}`
    );
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    if (username !== undefined) {
      const trimmed = String(username).trim();
      if (trimmed.length < 2 || trimmed.length > 50) {
        const err = new Error("Username must be 2-50 characters");
        err.status = 400;
        throw err;
      }
      user.username = trimmed;
    }

    if (profileImage !== undefined) {
      if (profileImage === null || profileImage === "") {
        user.profileImage = null;
      } else if (typeof profileImage === "string") {
        // Soft cap to avoid blowing up a VARCHAR column with huge base64 payloads.
        if (profileImage.length > 100_000) {
          const err = new Error("Profile image is too large (max ~75KB)");
          err.status = 413;
          throw err;
        }
        user.profileImage = profileImage;
      }
    }

    await user.save();
    auditLog({ action: "PROFILE_UPDATED", userId: user.id });
    return { status: 200, body: { success: true, user: publicUser(user) } };
  },

  async deleteAccount(userId, { password }) {
    console.log(`[authService] deleteAccount -> userId=${userId}`);
    if (!userId) {
      const err = new Error("Not authenticated");
      err.status = 401;
      throw err;
    }
    if (!password || typeof password !== "string") {
      const err = new Error("Password is required to delete your account");
      err.status = 400;
      err.code = "PASSWORD_REQUIRED";
      throw err;
    }

    const user = await userRepository.findByPk(userId);
    console.log(
      `[authService] deleteAccount DB lookup -> userId=${userId} found=${!!user}`
    );
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      auditLog({ action: "ACCOUNT_DELETE_FAILED", userId: user.id });
      const err = new Error("Password is incorrect");
      err.status = 400;
      err.code = "PASSWORD_INVALID";
      throw err;
    }

    const snapshot = { id: user.id, email: user.email };
    await user.destroy();

    auditLog({
      action: "ACCOUNT_DELETED",
      userId: snapshot.id,
      email: snapshot.email,
    });

    return {
      status: 200,
      body: {
        success: true,
        message: "Your account has been permanently deleted.",
      },
    };
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    console.log(`[authService] changePassword -> userId=${userId}`);
    if (!userId) {
      const err = new Error("Not authenticated");
      err.status = 401;
      throw err;
    }
    if (!currentPassword || !newPassword) {
      const err = new Error("Current and new password are required");
      err.status = 400;
      throw err;
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      const err = new Error("New password must be at least 8 characters");
      err.status = 400;
      err.code = "PASSWORD_WEAK";
      throw err;
    }
    if (currentPassword === newPassword) {
      const err = new Error("New password must be different from current password");
      err.status = 400;
      throw err;
    }

    const user = await userRepository.findByPk(userId);
    console.log(
      `[authService] changePassword DB lookup -> userId=${userId} found=${!!user}`
    );
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      auditLog({ action: "PASSWORD_CHANGE_FAILED", userId: user.id });
      const err = new Error("Current password is incorrect");
      err.status = 400;
      err.code = "CURRENT_PASSWORD_INVALID";
      throw err;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    auditLog({ action: "PASSWORD_CHANGED", userId: user.id });
    return {
      status: 200,
      body: { success: true, message: "Password changed successfully" },
    };
  },

  async getUserById(requestingUser, id) {
    if (
      !isAdminRole(requestingUser.role) &&
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
    if (!token || typeof token !== "string") {
      const err = new Error("Verification token is required");
      err.status = 400;
      err.code = "TOKEN_MISSING";
      throw err;
    }

    // 1) Token must exist in DB (prevents reuse after success: we clear it on verify).
    const user = await userRepository.findByVerificationToken(token);

    // Special case: token cleared (account already verified by an earlier click).
    // We can't auto-login here because we don't know who you are — the JWT alone
    // could still tell us, so try that first.
    if (!user) {
      try {
        const decoded = jwt.verify(token, ACCESS_SECRET);
        if (decoded.typ === "verify" && decoded.sub) {
          const alreadyVerified = await userRepository.findByPk(decoded.sub);
          if (alreadyVerified?.isVerified) {
            return {
              status: 200,
              body: {
                success: true,
                message: "Email already verified",
                accessToken: signAccessToken(alreadyVerified),
                refreshToken: issueRefreshToken(alreadyVerified),
                user: publicUser(alreadyVerified),
              },
            };
          }
        }
      } catch {
        // fall through to generic invalid-token error below
      }
      const err = new Error("Invalid or expired verification link");
      err.status = 400;
      err.code = "TOKEN_INVALID";
      throw err;
    }

    if (user.isVerified) {
      // Idempotent: someone hit the link twice — auto-login again.
      return {
        status: 200,
        body: {
          success: true,
          message: "Email already verified",
          accessToken: signAccessToken(user),
          refreshToken: issueRefreshToken(user),
          user: publicUser(user),
        },
      };
    }

    // 2) JWT must still be valid (24h expiry encoded inside).
    try {
      const decoded = jwt.verify(token, ACCESS_SECRET);
      if (decoded.typ !== "verify" || String(decoded.sub) !== String(user.id)) {
        throw new Error("Token payload mismatch");
      }
    } catch {
      const err = new Error("Verification link has expired. Please request a new one.");
      err.status = 400;
      err.code = "TOKEN_EXPIRED";
      throw err;
    }

    // DB writes unchanged — schema untouched.
    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    auditLog({ action: "EMAIL_VERIFIED", userId: user.id });

    // Mint auto-login credentials so the frontend can drop the user straight
    // into the app without a manual login step.
    const accessToken = signAccessToken(user);
    const refreshToken = issueRefreshToken(user);

    return {
      status: 200,
      body: {
        success: true,
        message: "Email verified successfully",
        accessToken,
        refreshToken,
        user: publicUser(user),
      },
    };
  },

  async requestReset({ email }) {
    console.log("FORGOT PASSWORD TRIGGERED ->", { email });

    if (!email || typeof email !== "string") {
      const err = new Error("Valid email required");
      err.status = 400;
      throw err;
    }

    // Always reply identically — never leak which emails exist.
    const genericResponse = {
      status: 200,
      body: {
        success: true,
        message: "If an account exists for that email, a reset link has been sent.",
      },
    };

    const user = await userRepository.findByEmail(email.trim().toLowerCase());
    if (!user) {
      auditLog({ action: "PASSWORD_RESET_REQUEST_UNKNOWN", email });
      return genericResponse;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    try {
      await sendPasswordResetEmail(
        user.email,
        buildResetUrl(resetToken),
        Math.round(RESET_TOKEN_TTL_MS / 60000)
      );
      console.log("EMAIL SENT -> reset ->", user.email);
    } catch (err) {
      console.error(`EMAIL ERROR: reset email -> ${err.message}`);
    }

    auditLog({ action: "PASSWORD_RESET_REQUEST", userId: user.id });
    return genericResponse;
  },

  async resetPassword(token, { password, newPassword }) {
    const pwd = newPassword ?? password;

    if (!token || typeof token !== "string") {
      const err = new Error("Reset token is required");
      err.status = 400;
      err.code = "TOKEN_MISSING";
      throw err;
    }
    if (!pwd || typeof pwd !== "string" || pwd.length < 8) {
      const err = new Error("Password must be at least 8 characters");
      err.status = 400;
      err.code = "PASSWORD_WEAK";
      throw err;
    }

    const user = await userRepository.findByResetToken(token);
    const expiresAt = user?.resetPasswordExpires
      ? new Date(user.resetPasswordExpires).getTime()
      : 0;

    if (!user || !expiresAt || expiresAt < Date.now()) {
      const err = new Error("Invalid or expired token");
      err.status = 400;
      err.code = "RESET_TOKEN_INVALID";
      throw err;
    }

    user.password = await bcrypt.hash(pwd, 10);
    // Clear immediately so the token can't be reused.
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    auditLog({ action: "PASSWORD_RESET_COMPLETE", userId: user.id });
    return {
      status: 200,
      body: { success: true, message: "Password reset successful" },
    };
  },
};
