import express from "express";
import Joi from "joi";
import BorrowedBook from "../models/BorrowedBook.js";
import Book from "../models/Book.js";
import NodeCache from "node-cache"; 

const router = express.Router();

const borrowSchema = Joi.object({
  userId: Joi.number().integer().required(),
  bookId: Joi.number().integer().required(),
});

const cache = new NodeCache({ stdTTL: 60 });


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


    cache.del(`borrowed_${userId}`);

    return res.json({
      message: "Book borrowed successfully!",
      borrowed,
      links: {
        self: "/api/borrow",
        history: `/api/borrow/${userId}`,
        return_book: `/api/borrow/return/${borrowed.id}`,
      },
    });

  } catch (err) {
    console.error("Borrow POST error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const cacheKey = `borrowed_${userId}`;
    const cachedData = cache.get(cacheKey);

    let data;

    if (cachedData) {
      console.log(" CACHE HIT");
      data = cachedData;
    } else {
      console.log(" CACHE MISS");

      data = await BorrowedBook.findAll({
        where: { user_id: userId },
        include: [
          {
            model: Book,
            attributes: ["id", "title", "author", "image"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      cache.set(cacheKey, data);
    }

    return res.json({
      source: cachedData ? "cache" : "database",
      data,

      links: {
        self: `/api/borrow/${userId}`,
        borrow: "/api/borrow",
        login: "/api/auth/login",
        return_book: "/api/borrow/return/:id",
        docs: "/api-docs",
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


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

  
    cache.del(`borrowed_${borrow.user_id}`);

    return res.json({
      message: "Book returned successfully",
      borrow,
      links: {
        history: `/api/borrow/${borrow.user_id}`,
        borrow_again: "/api/borrow",
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;