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

router.get("/:id", authMiddleware, getUserById);

export default router;
