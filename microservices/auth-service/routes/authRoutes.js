import express from "express";
import {
  register,
  login,
  refresh,
  logout,
  getUserById,
  verifyEmail,
  requestReset,
  resetPassword,
  resetPasswordRedirect,
  testEmail,
  updateMyProfile,
  changeMyPassword,
  getMySession,
  logoutAllDevices,
  deleteMyAccount,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

const getNotAllowed = (postPath, bodyHint) => (req, res) => {
  res
    .status(405)
    .set("Allow", "POST, OPTIONS")
    .json({
      error: "Method Not Allowed",
      message: `Use POST ${postPath} with JSON body (this URL is not meant to be opened in the browser).`,
      postPath,
      exampleBody: bodyHint,
    });
};

router.get(
  "/login",
  getNotAllowed("/auth/login", { email: "user@example.com", password: "your-password" })
);
router.get(
  "/register",
  getNotAllowed("/auth/register", {
    name: "Your Name",
    email: "user@example.com",
    password: "your-password",
  })
);

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// --- Email verification ---
// Spec endpoint (token via query string, link sent in email):
router.get("/verify-email", verifyEmail);
// Legacy alias used by existing frontend:
router.get("/verify/:token", verifyEmail);

// --- Forgot / reset password ---
// Spec endpoints:
router.post("/forgot-password", requestReset);
router.get("/reset-password", resetPasswordRedirect); // email-link -> frontend form
router.post("/reset-password", resetPassword);        // form submit (token in body)
// Legacy aliases used by existing frontend:
router.post("/reset-request", requestReset);
router.post("/reset/:token", resetPassword);

// --- SMTP diagnostic endpoint (dev only by default) ---
// POST /auth/test-email  body: { to: "user@example.com" }
router.post("/test-email", testEmail);

router.get(
  "/admin",
  authMiddleware,
  allowRoles("ROLE_ADMIN"),
  (req, res) => {
    res.json({ message: "Admin only" });
  }
);

router.get(
  "/profile",
  authMiddleware,
  allowRoles("ROLE_ADMIN", "ROLE_USER", "ROLE_LIBRARIAN"),
  (req, res) => {
    res.json({ message: "User profile access" });
  }
);

// Trace which /me/* route was hit and what the resolved user id is.
// Helps catch (a) stale processes that don't have these routes yet and
// (b) mismatches between JWT payload and DB.
const traceMe = (label) => (req, res, next) => {
  const id = req.user?.id ?? req.user?.sub ?? null;
  console.log(
    `[auth /me] ${label} hit -> method=${req.method} path=${req.originalUrl} userId=${id}`
  );
  next();
};

// --- Profile self-service (authenticated user, any role) ---
// Mounted BEFORE /:id so "/me/*" doesn't get swallowed by the wildcard.
router.patch("/me", authMiddleware, traceMe("update-profile"), updateMyProfile);
router.post("/me/password", authMiddleware, traceMe("change-password"), changeMyPassword);
router.get("/me/session", authMiddleware, traceMe("session"), getMySession);
router.post("/me/logout-all", authMiddleware, traceMe("logout-all"), logoutAllDevices);
// POST (not DELETE) so the password confirmation body is reliably parsed by
// every HTTP client and proxy in the chain.
router.post("/me/delete", authMiddleware, traceMe("delete-account"), deleteMyAccount);

router.get("/:id", authMiddleware, getUserById);

export default router;
