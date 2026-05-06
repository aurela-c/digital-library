import Book from "../models/Book.js";

export const GetAllBooks = async (call, callback) => {
  try {
    const books = await Book.findAll();

    callback(null, {
      books: books.map((b) => ({
        id: b.id.toString(),
        title: b.title,
        author: b.author,
        image: b.image,
        description: b.description,
        categoryId: b.category_id,
        totalCopies: b.total_copies,
        availableCopies: b.available_copies,
        createdAt: b.created_at,
      })),
    });
  } catch (err) {
    callback({ code: 13, message: "Server error" });
  }
};

export const GetBook = async (call, callback) => {
  try {
    const book = await Book.findByPk(call.request.id);

    if (!book) {
      return callback({ code: 5, message: "Book not found" });
    }

    callback(null, {
      id: book.id.toString(),
      title: book.title,
      author: book.author,
      image: book.image,
      description: book.description,
      categoryId: book.category_id,
      totalCopies: book.total_copies,
      availableCopies: book.available_copies,
      createdAt: book.created_at,
    });
  } catch (err) {
    callback({ code: 13, message: "Server error" });
  }
};

export const AddBook = async (call, callback) => {
  try {
    const newBook = await Book.create({
      title: call.request.title,
      author: call.request.author,
      image: call.request.image,
      description: call.request.description,
      category_id: call.request.categoryId,
      total_copies: call.request.totalCopies,
      available_copies: call.request.totalCopies,
    });

    callback(null, {
      id: newBook.id.toString(),
      title: newBook.title,
      author: newBook.author,
      image: newBook.image,
      description: newBook.description,
      categoryId: newBook.category_id,
      totalCopies: newBook.total_copies,
      availableCopies: newBook.available_copies,
      createdAt: newBook.created_at,
    });
  } catch (err) {
    callback({ code: 13, message: "Server error" });
  }
};

export const UpdateAvailability = async (call, callback) => {
  try {
    const book = await Book.findByPk(call.request.id);

    if (!book) {
      return callback({ code: 5, message: "Book not found" });
    }

    await book.update({
      available_copies: call.request.availableCopies,
    });

    callback(null, {
      id: book.id.toString(),
      title: book.title,
      author: book.author,
      image: book.image,
      description: book.description,
      categoryId: book.category_id,
      totalCopies: book.total_copies,
      availableCopies: book.available_copies,
      createdAt: book.created_at,
    });
  } catch (err) {
    callback({ code: 13, message: "Server error" });
  }
};