import express from "express";
import Joi from "joi";
import BorrowedBook from "../models/BorrowedBook.js";
import Book from "../models/Book.js";

const router = express.Router();

const borrowSchema = Joi.object({
  userId: Joi.number().integer().required(),
  bookId: Joi.number().integer().required(),
});


//borrow book
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

    const borrowed = await BorrowedBook.create({
      user_id: userId,
      book_id: bookId,
      status: "borrowed",
    });

    await book.update({
      available_copies: book.available_copies - 1,
    });

    return res.json({
      message: "Book borrowed successfully!",
      borrowed,
    });

  } catch (err) {
    console.error("Borrow POST error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// get borrowed book
router.get("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const data = await BorrowedBook.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Book,
          attributes: ["id", "title", "author", "image"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // 🔥 ALWAYS return clean array (important for React)
    return res.json(data);

  } catch (err) {
    console.error("GET borrow error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// return book
router.put("/return/:id", async (req, res) => {
  try {
    const borrowId = req.params.id;

    const borrow = await BorrowedBook.findByPk(borrowId, {
      include: Book,
    });

    if (!borrow) {
      return res.status(404).json({ error: "Borrow record not found" });
    }

    if (borrow.status === "returned") {
      return res.status(400).json({ error: "Already returned" });
    }

    await borrow.update({
      return_date: new Date(),
      status: "returned",
    });

    const book = await Book.findByPk(borrow.book_id);

    await book.update({
      available_copies: book.available_copies + 1,
    });

    return res.json({
      message: "Book returned successfully",
      borrow,
    });

  } catch (err) {
    console.error("RETURN error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;