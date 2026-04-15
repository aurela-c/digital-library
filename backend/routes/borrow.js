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
    const { userId, bookId } = req.body;

   
    const { error } = borrowSchema.validate({ userId, bookId });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

  
    const book = await Book.findByPk(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: "No copies available" });
    }

    
    const exists = await BorrowedBook.findOne({
      where: {
        user_id: userId,
        book_id: bookId,
        status: "borrowed",
      },
    });

    if (exists) {
      return res.status(400).json({ error: "Book already borrowed." });
    }

    // Create borrow record
    const borrowed = await BorrowedBook.create({
      user_id: userId,
      book_id: bookId,
      status: "borrowed",
    });

    
    await book.update({
      available_copies: book.available_copies - 1,
    });

    res.json({
      message: "Book borrowed successfully!",
      borrowed,
    });

  } catch (err) {
    console.error("Borrow POST error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const borrowed = await BorrowedBook.findAll({
      where: {
        user_id: userId,
        status: "borrowed",
      },
      include: [
        {
          model: Book,
          attributes: ["id", "title", "author", "image"],
        },
      ],
    });

    res.json(borrowed);

  } catch (err) {
    console.error("Borrow GET error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;