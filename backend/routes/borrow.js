import express from "express";
import Joi from "joi";
import BorrowedBook from "../models/BorrowedBook.js";
import Book from "../models/Book.js";

const router = express.Router();

const borrowSchema = Joi.object({
  userId: Joi.number().integer().required(),
  bookId: Joi.number().integer().required(),
});

router.post("/", async (req, res) => {
  try {
    const { error, value } = borrowSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { userId, bookId } = value;

    const exists = await BorrowedBook.findOne({ where: { user_id: userId, book_id: bookId } });
    if (exists) return res.status(400).json({ error: "Book already borrowed." });

    const borrowed = await BorrowedBook.create({
      user_id: userId,
      book_id: bookId,
      status: "borrowed",
    });

    res.json({ message: "Book borrowed successfully!", borrowed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const borrowed = await BorrowedBook.findAll({
      where: { user_id: userId },
      include: Book,
    });

    res.json(borrowed.map(b => b.Book));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;