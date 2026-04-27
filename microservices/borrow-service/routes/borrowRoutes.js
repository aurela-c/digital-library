import express from "express";
import {
  borrowBook,
  getBorrows,
  returnBook,
} from "../controllers/borrowController.js";

const router = express.Router();

router.post("/", borrowBook);
router.get("/:id", getBorrows);
router.put("/return/:id", returnBook);

export default router;