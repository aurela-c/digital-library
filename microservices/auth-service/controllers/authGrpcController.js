import * as grpc from "@grpc/grpc-js";
import { authService } from "../services/authService.js";

const toUserProfile = (u) =>
  u
    ? {
        id: String(u.id),
        username: u.username || "",
        email: u.email || "",
        role: u.role || "",
        profileImage: u.profileImage || "",
        accountStatus: u.accountStatus || "ACTIVE",
      }
    : null;

const mapErr = (e) => {
  const status = e.status || 500;
  let code =
    status === 400
      ? grpc.status.INVALID_ARGUMENT
      : status === 401
        ? grpc.status.UNAUTHENTICATED
        : status === 403
          ? grpc.status.PERMISSION_DENIED
          : status === 404
            ? grpc.status.NOT_FOUND
            : grpc.status.INTERNAL;
  if (
    status === 400 &&
    /invalid credentials/i.test(String(e.message || ""))
  ) {
    code = grpc.status.UNAUTHENTICATED;
  }
  return { code, message: e.message || "error" };
};

export const Register = async (call, callback) => {
  try {
    const { username, email, password } = call.request;
    const { body } = await authService.register({
      name: username || email,
      email,
      password,
    });
    callback(null, {
      ok: true,
      message: body?.message || "",
      userId: "",
      accessToken: "",
      refreshToken: "",
      user: null,
    });
  } catch (e) {
    callback(mapErr(e));
  }
};

export const Login = async (call, callback) => {
  try {
    const { email, password } = call.request;
    const { body } = await authService.login({ email, password });
    const u = body.user;
    callback(null, {
      ok: true,
      userId: String(u.id),
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      user: toUserProfile(u),
      message: "",
    });
  } catch (e) {
    callback(mapErr(e));
  }
};

export const RefreshToken = async (call, callback) => {
  try {
    const { refreshToken } = call.request;
    const { body } = await authService.refresh({
      token: refreshToken,
    });
    callback(null, {
      ok: true,
      userId: "",
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      user: null,
      message: "",
    });
  } catch (e) {
    callback(mapErr(e));
  }
};

export const ValidateAccessToken = async (call, callback) => {
  try {
    const jwt = (await import("jsonwebtoken")).default;
    const ACCESS_SECRET = process.env.ACCESS_SECRET || "ACCESS_SECRET_KEY";
    const token = call.request.accessToken;
    if (!token) {
      return callback(null, {
        valid: false,
        errorMessage: "No token",
      });
    }
    const decoded = jwt.verify(token, ACCESS_SECRET);
    callback(null, {
      valid: true,
      userId: String(decoded.sub ?? decoded.id ?? ""),
      role: String(decoded.role || ""),
      email: String(decoded.email || ""),
    });
  } catch (e) {
    callback(null, {
      valid: false,
      errorMessage: e.message || "Invalid token",
    });
  }
};
