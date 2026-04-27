import Book from "../models/Book.js";

// GET ALL BOOKS
export const getBooks = async (req, res) => {
  const books = await Book.findAll();
  res.json(books);
};

// GET ONE BOOK
export const getBookById = async (req, res) => {
  const book = await Book.findByPk(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });
  res.json(book);
};

// CREATE BOOK
export const createBook = async (req, res) => {
  const book = await Book.create(req.body);
  res.json(book);
};

// UPDATE BOOK
export const updateBook = async (req, res) => {
  const book = await Book.findByPk(req.params.id);
  if (!book) return res.status(404).json({ error: "Book not found" });

  await book.update(req.body);
  res.json(book);
};

// DELETE BOOK
export const deleteBook = async (req, res) => {
  await Book.destroy({ where: { id: req.params.id } });
  res.json({ message: "Book deleted" });
};