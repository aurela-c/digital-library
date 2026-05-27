import Book from "../models/Book.js";
import { Op } from "sequelize";

/**
 * Proto safety: the `BookResponse.categoryId` field is declared as
 * `string`, so we always emit a string (or "" for NULL). The DB column
 * is INT. Without this explicit coercion grpc-js will warn or, on
 * stricter runtimes, throw.
 */
const toCategoryIdStr = (v) =>
  v === null || v === undefined || v === "" ? "" : String(v);

const toBookResponse = (b) => ({
  id: b.id.toString(),
  title: b.title,
  author: b.author,
  image: b.image,
  description: b.description,
  categoryId: toCategoryIdStr(b.category_id),
  totalCopies: b.total_copies,
  availableCopies: b.available_copies,
  // Not a proto field — only carried in HTTP responses (we already
  // serialize the result via res.json() in updateBookHttp). gRPC clients
  // will simply ignore it.
  isPopular: Boolean(b.is_popular),
  createdAt: b.created_at ? new Date(b.created_at).toISOString() : "",
});

export const GetAllBooks = async (call, callback) => {
  try {
    const page = parseInt(call.request.page) || 1;
    const limit = parseInt(call.request.limit) || 10;
    const offset = (page - 1) * limit;

    const { categoryId, author, title } = call.request;

    const where = {};

    // categoryId may arrive as a string from grpc (proto type is string)
    // or an int from HTTP query. Always normalise to a positive int
    // before filtering, otherwise "" silently filters nothing.
    if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
      const n = Number(categoryId);
      if (Number.isFinite(n) && n > 0) where.category_id = n;
    }
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

    console.log(
      `[book] GetAllBooks -> filter=${JSON.stringify(where)} returned=${result.count}`
    );

    callback(null, {
      total: result.count,
      page,
      pages: Math.ceil(result.count / limit),
      books: result.rows.map(toBookResponse),
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

    callback(null, toBookResponse(book));

  } catch (err) {
    console.error("GetBook ERROR:", err.message);
    callback({ code: 13, message: "Server error" });
  }
};

export const AddBook = async (call, callback) => {
  try {
    const { title, author, categoryId, totalCopies } = call.request;

    console.log(
      `[book] AddBook received -> title="${title}" author="${author}" categoryId=${categoryId} (typeof ${typeof categoryId}) totalCopies=${totalCopies}`
    );

    if (!title || !author || !categoryId || !totalCopies) {
      return callback({
        code: 3,
        message:
          "Missing required fields. Required: title, author, categoryId, totalCopies.",
      });
    }

    const totalCopiesInt = Number(totalCopies);
    if (!Number.isFinite(totalCopiesInt) || totalCopiesInt < 1) {
      return callback({
        code: 3,
        message: "totalCopies must be a positive integer.",
      });
    }

    // category_id MUST be a positive integer — the admin UI sends 1..6,
    // but we don't hardcode that range so future categories can be
    // added without code changes.
    const categoryIdInt = Number(categoryId);
    if (!Number.isFinite(categoryIdInt) || categoryIdInt < 1) {
      return callback({
        code: 3,
        message: "categoryId must be a positive integer.",
      });
    }

    const newBook = await Book.create({
      title: String(title).trim(),
      author: String(author).trim(),
      image: call.request.image ? String(call.request.image).trim() : null,
      description: call.request.description
        ? String(call.request.description)
        : null,
      category_id: categoryIdInt,
      total_copies: totalCopiesInt,
      available_copies: totalCopiesInt,
    });

    console.log(
      `[book] created -> id=${newBook.id} title="${newBook.title}" stored category_id=${newBook.category_id}`
    );

    callback(null, toBookResponse(newBook));

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

    callback(null, toBookResponse(book));

  } catch (err) {
    console.error("UpdateAvailability ERROR:", err.message);
    callback({ code: 13, message: "Server error" });
  }
};

/**
 * Full-field admin update. Used by the HTTP route `PUT /books/:id`.
 *
 * NOTE: This intentionally bypasses gRPC. The gRPC `UpdateAvailability`
 * RPC is still used internally by borrow-service to bump available_copies
 * on borrow/return, so we don't touch the proto.
 */
const ALLOWED_BOOK_FIELDS = [
  "title",
  "author",
  "image",
  "description",
  "category_id",
  "total_copies",
  "available_copies",
  "is_popular",
];

export const updateBookHttp = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid book id" });
    }

    const book = await Book.findByPk(id);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    // Whitelist + map camelCase -> snake_case
    const fieldAliases = {
      categoryId: "category_id",
      totalCopies: "total_copies",
      availableCopies: "available_copies",
      isPopular: "is_popular",
    };
    const patch = {};
    for (const [key, value] of Object.entries(req.body || {})) {
      const dbField = fieldAliases[key] || key;
      if (!ALLOWED_BOOK_FIELDS.includes(dbField)) continue;
      patch[dbField] = value;
    }

    if (typeof patch.title === "string") patch.title = patch.title.trim();
    if (typeof patch.author === "string") patch.author = patch.author.trim();

    if (patch.is_popular !== undefined) {
      patch.is_popular = Boolean(patch.is_popular);
    }

    for (const numField of [
      "category_id",
      "total_copies",
      "available_copies",
    ]) {
      if (patch[numField] !== undefined && patch[numField] !== null) {
        const n = Number(patch[numField]);
        if (!Number.isFinite(n)) {
          return res.status(400).json({
            success: false,
            message: `${numField} must be a number`,
          });
        }
        patch[numField] = n;
      }
    }

    // Defensive: never let available_copies exceed total_copies after update.
    const nextTotal =
      patch.total_copies !== undefined ? patch.total_copies : book.total_copies;
    if (
      patch.available_copies !== undefined &&
      patch.available_copies > nextTotal
    ) {
      patch.available_copies = nextTotal;
    }
    if (
      patch.total_copies !== undefined &&
      book.available_copies > patch.total_copies &&
      patch.available_copies === undefined
    ) {
      patch.available_copies = patch.total_copies;
    }

    if (Object.keys(patch).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No updatable fields supplied" });
    }

    await book.update(patch);

    console.log(
      `[book] updated -> id=${book.id} keys=${Object.keys(patch).join(",")} stored category_id=${book.category_id}`
    );

    return res.json({
      success: true,
      message: "Book updated",
      book: toBookResponse(book),
    });
  } catch (err) {
    console.error("[book] updateBookHttp error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update book" });
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