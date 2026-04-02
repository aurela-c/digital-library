import express from "express";
import Joi from "joi";
import BorrowedBook from "../models/BorrowedBook.js";

const router = express.Router();

const borrowSchema = Joi.object({
  userId: Joi.number().integer().required(),
  bookId: Joi.number().integer().required(),
});

router.post("/", async (req, res) => {
  try {
    const { userId, bookId } = req.body;

    
    const { error } = borrowSchema.validate({ userId, bookId });
    if (error) return res.status(400).json({ error: error.details[0].message });

    
    const exists = await BorrowedBook.findOne({ where: { user_id: userId, book_id: bookId } });
    if (exists) return res.status(400).json({ error: "Book already borrowed." });

    
    const borrowed = await BorrowedBook.create({
      user_id: userId,
      book_id: bookId,
      status: "borrowed",
    });

    res.json({ message: "Book borrowed successfully!", borrowed });
  } catch (err) {
    console.error("Borrow route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;