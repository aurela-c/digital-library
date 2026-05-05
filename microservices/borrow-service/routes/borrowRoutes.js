import express from "express";
import {
  borrowBook,
  getBorrows,
  returnBook,
} from "../controllers/borrowController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();


router.post("/", authMiddleware, authorize("ROLE_USER"), borrowBook);

router.get(
  "/:id",
  authMiddleware,
  authorize("ROLE_USER", "ROLE_ADMIN"),
  getBorrows
);

router.put(
  "/return/:id",
  authMiddleware,
  authorize("ROLE_USER", "ROLE_ADMIN"),
  returnBook
);

export default router;