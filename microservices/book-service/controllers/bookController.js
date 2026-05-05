import Book from "../models/Book.js";
import Joi from "joi";


const bookSchema = Joi.object({
  title: Joi.string().required(),
  author: Joi.string().required(),
  publishedYear: Joi.number().optional(),
});

//  GET ALL BOOKS
export const getBooks = async (req, res) => {
  try {
    const books = await Book.findAll();
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET ONE BOOK
export const getBookById = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(book);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// CREATE BOOK 
export const createBook = async (req, res) => {
  try {
    const { error } = bookSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const book = await Book.create(req.body);
    res.status(201).json(book);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// UPDATE BOOK 
export const updateBook = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    await book.update(req.body);
    res.json(book);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

//  DELETE BOOK 
export const deleteBook = async (req, res) => {
  try {
    const deleted = await Book.destroy({
      where: { id: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json({ message: "Book deleted" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};