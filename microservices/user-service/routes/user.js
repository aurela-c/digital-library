import express from "express";
import {
  getAllUsers,
  getUserById,
} from "../controllers/userController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, authorize("ROLE_ADMIN"), getAllUsers);

router.get(
  "/:id",
  authMiddleware,
  authorize("ROLE_USER", "ROLE_ADMIN"),
  getUserById
);

export default router;