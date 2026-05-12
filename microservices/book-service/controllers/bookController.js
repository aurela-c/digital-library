import Book from "../models/Book.js";
import { Op } from "sequelize";

export const GetAllBooks = async (call, callback) => {
  try {
    const page = parseInt(call.request.page) || 1;
    const limit = parseInt(call.request.limit) || 10;
    const offset = (page - 1) * limit;

    const { categoryId, author, title } = call.request;

    const where = {};

    if (categoryId) where.category_id = categoryId;
    if (author) where.author = author;

    if (title) {
      where.title = {
        [Op.like]: `%${title}%`,
      };
    }

    const result = await Book.findAndCountAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    callback(null, {
      total: result.count,
      page,
      pages: Math.ceil(result.count / limit),
      books: result.rows.map((b) => ({
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
    console.error("GetAllBooks ERROR:", err.message);
    callback({ code: 13, message: "Server error" });
  }
};

export const GetBook = async (call, callback) => {
  try {
    const { id } = call.request;

    if (!id) {
      return callback({ code: 3, message: "ID is required" });
    }

    const book = await Book.findByPk(id);

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
    console.error("GetBook ERROR:", err.message);
    callback({ code: 13, message: "Server error" });
  }
};

export const AddBook = async (call, callback) => {
  try {
    const { title, author, categoryId, totalCopies } = call.request;

    if (!title || !author || !categoryId || !totalCopies) {
      return callback({
        code: 3,
        message: "Missing required fields",
      });
    }

    const newBook = await Book.create({
      title,
      author,
      image: call.request.image || null,
      description: call.request.description || null,
      category_id: categoryId,
      total_copies: totalCopies,
      available_copies: totalCopies,
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
    console.error("AddBook ERROR:", err.message);
    callback({ code: 13, message: "Server error" });
  }
};

export const UpdateAvailability = async (call, callback) => {
  try {
    const { id, availableCopies: acField, quantity } = call.request;
    const availableCopies =
      acField !== undefined && acField !== null ? acField : quantity;

    if (!id) {
      return callback({ code: 3, message: "ID is required" });
    }

    const book = await Book.findByPk(id);

    if (!book) {
      return callback({ code: 5, message: "Book not found" });
    }

    if (availableCopies === undefined || availableCopies === null) {
      return callback({ code: 3, message: "availableCopies is required" });
    }

    if (availableCopies < 0) {
      return callback({
        code: 3,
        message: "Invalid available copies",
      });
    }

    await book.update({
      available_copies: availableCopies,
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
    console.error("UpdateAvailability ERROR:", err.message);
    callback({ code: 13, message: "Server error" });
  }
};

export const DeleteBook = async (call, callback) => {
  try {
    const { id } = call.request;

    if (!id) {
      return callback({ code: 3, message: "ID is required" });
    }

    const book = await Book.findByPk(id);

    if (!book) {
      return callback({ code: 5, message: "Book not found" });
    }

    await book.destroy();
    callback(null, {});
  } catch (err) {
    console.error("DeleteBook ERROR:", err.message);
    callback({ code: 13, message: "Server error" });
  }
};