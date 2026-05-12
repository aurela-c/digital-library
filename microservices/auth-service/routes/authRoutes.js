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
router.get("/verify/:token", verifyEmail);
router.post("/reset-request", requestReset);
router.post("/reset/:token", resetPassword);

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
