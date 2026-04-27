import BorrowedBook from "../models/BorrowedBook.js";
import axios from "axios";
import Joi from "joi";

const schema = Joi.object({
  userId: Joi.number().required(),
  bookId: Joi.number().required(),
});

// BORROW BOOK
export const borrowBook = async (req, res) => {
  try {
    const { userId, bookId } = req.body;

    const { error } = schema.validate({ userId, bookId });
    if (error) return res.status(400).json({ error: error.message });

    // check book from book-service
    const bookRes = await axios.get(
      `http://localhost:5003/books/${bookId}`
    );

    const book = bookRes.data;

    if (!book) return res.status(404).json({ error: "Book not found" });

    if (book.available_copies <= 0)
      return res.status(400).json({ error: "No copies available" });

    const exists = await BorrowedBook.findOne({
      where: {
        user_id: userId,
        book_id: bookId,
        status: "borrowed",
      },
    });

    if (exists)
      return res.status(400).json({ error: "Already borrowed" });

    const borrow = await BorrowedBook.create({
      user_id: userId,
      book_id: bookId,
    });

    await axios.put(
      `http://localhost:5003/books/decrease/${bookId}`
    );

    res.json({ message: "Borrowed successfully", borrow });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET USER BORROWS
export const getBorrows = async (req, res) => {
  try {
    const data = await BorrowedBook.findAll({
      where: { user_id: req.params.id },
      order: [["created_at", "DESC"]],
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// RETURN BOOK
export const returnBook = async (req, res) => {
  try {
    const borrow = await BorrowedBook.findByPk(req.params.id);

    if (!borrow)
      return res.status(404).json({ error: "Not found" });

    if (borrow.status === "returned")
      return res.status(400).json({ error: "Already returned" });

    await borrow.update({
      status: "returned",
      return_date: new Date(),
    });

    await axios.put(
      `http://localhost:5003/books/increase/${borrow.book_id}`
    );

    res.json({ message: "Returned successfully", borrow });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};