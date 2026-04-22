import express from "express";
import Joi from "joi";
import BorrowedBook from "../models/BorrowedBook.js";
import Book from "../models/Book.js";

const router = express.Router();

const borrowSchema = Joi.object({
  userId: Joi.number().integer().required(),
  bookId: Joi.number().integer().required(),
  });

  /**
 * @swagger
 * /api/v1/borrow:
 *   post:
 *     summary: Borrow a book
 *     description: Allows a user to borrow a book if copies are available.
 *     tags: [Borrow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               bookId:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Book borrowed successfully
 *       400:
 *         description: Validation error or no copies available
 *       404:
 *         description: Book not found
 */

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

    res.json({
      message: "Book borrowed successfully!",
      borrowed,
    });

  } catch (err) {
    console.error("Borrow POST error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/v1/borrow/{userId}:
 *   get:
 *     summary: Get borrowed books by user
 *     description: Returns the borrow history for a specific user.
 *     tags: [Borrow]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: List of borrowed books
 */

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const borrowed = await BorrowedBook.findAll({
      where: {
        user_id: userId,
      },
      include: [
        {
          model: Book,
          attributes: ["id", "title", "author", "image"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json(borrowed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


export default router;