import express from "express";
import {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
} from "../controllers/bookController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getBooks);
router.get("/:id", authMiddleware, getBookById);

router.post("/", authMiddleware, authorize("ROLE_ADMIN"), createBook);
router.put("/:id", authMiddleware, authorize("ROLE_ADMIN"), updateBook);
router.delete("/:id", authMiddleware, authorize("ROLE_ADMIN"), deleteBook);

export default router;