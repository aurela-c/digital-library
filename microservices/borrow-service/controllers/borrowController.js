import Borrow from "../models/BorrowedBook.js";
import { promisify } from "util";
import bookClient from "../grpc/bookClient.js";

const getBookAsync = promisify(bookClient.GetBook.bind(bookClient));
const updateAvailabilityAsync = promisify(
  bookClient.UpdateAvailability.bind(bookClient)
);

const isBorrowedStatus = (status) =>
  String(status || "").toUpperCase() === "BORROWED";

async function bookSnippetForId(bookId) {
  try {
    const book = await getBookAsync({ id: String(bookId) });
    return {
      bookTitle: book.title || "",
      bookAuthor: book.author || "",
      bookImage: book.image || "",
    };
  } catch {
    return { bookTitle: "", bookAuthor: "", bookImage: "" };
  }
}
export const BorrowBook = async (call, callback) => {
  try {
    const { userId, bookId } = call.request;

    //  get book
    const book = await getBookAsync({ id: bookId });

    const available = Number(book.availableCopies);

    if (!available || available <= 0) {
      return callback({
        code: 9,
        message: "No copies available",
      });
    }

    await updateAvailabilityAsync({
      id: bookId,
      availableCopies: available - 1,
    });

  
    const borrow = await Borrow.create({
      user_id: userId,
      book_id: bookId,
      borrow_date: new Date(),
      return_date: null,
      status: "BORROWED",
    });

    const snippet = await bookSnippetForId(bookId);

    callback(null, {
      id: borrow.id.toString(),
      userId: String(borrow.user_id),
      bookId: String(borrow.book_id),
      borrowDate: borrow.borrow_date,
      returnDate: borrow.return_date,
      status: borrow.status,
      ...snippet,
    });

  } catch (err) {
    console.error("BorrowBook ERROR:", err.message);

    callback({
      code: 13,
      message: err.message || "Server error",
    });
  }
};

export const ReturnBook = async (call, callback) => {
  try {
    const { borrowId, actorUserId, actorRole } = call.request;

    if (!borrowId || !actorUserId) {
      return callback({
        code: 3,
        message: "borrowId and actorUserId are required",
      });
    }

    const borrow = await Borrow.findByPk(borrowId);

    if (!borrow || !isBorrowedStatus(borrow.status)) {
      return callback({
        code: 5,
        message: "Borrow record not found",
      });
    }

    const isAdmin = String(actorRole) === "ROLE_ADMIN";
    if (!isAdmin && String(borrow.user_id) !== String(actorUserId)) {
      return callback({
        code: 7,
        message: "Forbidden",
      });
    }

    const bookId = String(borrow.book_id);
    const book = await getBookAsync({ id: bookId });

    await updateAvailabilityAsync({
      id: bookId,
      availableCopies: Number(book.availableCopies) + 1,
    });

    await borrow.update({
      status: "RETURNED",
      return_date: new Date(),
    });

    await borrow.reload();

    callback(null, {
      id: borrow.id.toString(),
      userId: borrow.user_id,
      bookId: borrow.book_id,
      borrowDate: borrow.borrow_date,
      returnDate: borrow.return_date,
      status: borrow.status,
    });
  } catch (err) {
    console.error("ReturnBook ERROR:", err.message);

    callback({
      code: 13,
      message: "Server error",
    });
  }
};

export const GetBorrowsByUser = async (call, callback) => {
  try {
    const { userId } = call.request;
    const page = Math.max(1, Number(call.request.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(call.request.limit) || 200));

    const offset = (page - 1) * limit;

    const result = await Borrow.findAndCountAll({
      where: { user_id: userId },
      limit,
      offset,
      order: [["borrow_date", "DESC"]],
    });

    const borrows = await Promise.all(
      result.rows.map(async (b) => {
        const snippet = await bookSnippetForId(b.book_id);
        return {
          id: b.id.toString(),
          userId: String(b.user_id),
          bookId: String(b.book_id),
          borrowDate: b.borrow_date,
          returnDate: b.return_date,
          status: b.status,
          ...snippet,
        };
      })
    );

    callback(null, {
      total: result.count,
      page,
      pages: Math.ceil(result.count / limit),
      borrows,
    });

  } catch (err) {
    console.error("GetBorrowsByUser ERROR:", err.message);

    callback({
      code: 13,
      message: "Server error",
    });
  }
};