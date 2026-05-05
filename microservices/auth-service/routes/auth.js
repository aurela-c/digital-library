import express from "express";
import {
  register,
  login,
  getUserById,
  refresh,
  verifyEmail,
  requestReset,
  resetPassword,
} from "../controllers/authController.js";

import { auditLog, authMiddleware } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/register", auditLog("USER_REGISTER"), register);

router.post("/login", auditLog("USER_LOGIN"), login);

router.post("/refresh", auditLog("TOKEN_REFRESH"), refresh);

router.get("/verify/:token", verifyEmail);

router.post("/reset-request", requestReset);

router.post("/reset/:token", resetPassword);

router.get(
  "/:id",
  authMiddleware,
  auditLog("GET_USER_BY_ID"),
  getUserById
);


router.get(
  "/admin",
  authMiddleware,
  auditLog("ADMIN_ACCESS"),
  authorize("ROLE_ADMIN"),
  (req, res) => {
    res.json({ message: "Admin only" });
  }
);

router.get(
  "/profile",
  authMiddleware,
  auditLog("VIEW_PROFILE"),
  authorize("ROLE_ADMIN", "ROLE_USER"),
  (req, res) => {
    res.json({ message: "User profile access" });
  }
);

export default router;