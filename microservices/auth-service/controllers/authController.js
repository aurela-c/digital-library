import { authService } from "../services/authService.js";

const mapErr = (err, res) => {
  const status = err.status || 500;
  const payload = {
    error: err.message || "Server error",
    ...(err.code ? { code: err.code } : {}),
  };
  if (status >= 500 && process.env.NODE_ENV === "production") {
    payload.error = "Server error";
  }
  return res.status(status).json(payload);
};

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

export const verifyEmail = async (req, res) => {
  try {
    const { status, body } = await authService.verifyEmail(req.params.token);
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
    const { status, body } = await authService.resetPassword(req.params.token, req.body || {});
    return res.status(status).json(body);
  } catch (err) {
    return mapErr(err, res);
  }
};
