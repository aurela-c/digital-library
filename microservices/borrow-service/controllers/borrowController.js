import Borrow from "../models/BorrowedBook.js";


export const BorrowBook = async (call, callback) => {
  try {
    const { userId, bookId } = call.request;

    bookClient.GetBook({ id: bookId }, (err, book) => {
      if (err) {
        return callback({
          code: 5,
          message: "Book not found",
        });
      }

      const available = Number(book.availableCopies);

      if (!available || available <= 0) {
        return callback({
          code: 9,
          message: "No copies available",
        });
      }

      bookClient.UpdateAvailability(
        {
          id: bookId,
          availableCopies: available - 1,
        },
        async (err2) => {
          if (err2) {
            return callback({
              code: 13,
              message: "Failed to update book stock",
            });
          }

          try {
            const borrow = await Borrow.create({
              user_id: userId,
              book_id: bookId,
              borrow_date: new Date(),
              return_date: null,
              status: "BORROWED",
            });

            return callback(null, {
              id: borrow.id.toString(),
              userId: borrow.user_id,
              bookId: borrow.book_id,
              borrowDate: borrow.borrow_date,
              status: borrow.status,
            });

          } catch (dbErr) {
            return callback({
              code: 13,
              message: "Borrow DB insert failed",
            });
          }
        }
      );
    });

  } catch (err) {
    return callback({
      code: 13,
      message: err.message || "Server error",
    });
  }
};

export const ReturnBook = async (call, callback) => {
  try {
    const { userId, bookId } = call.request;

    const borrow = await Borrow.findOne({
      where: {
        user_id: userId,
        book_id: bookId,
        status: "BORROWED",
      },
    });

    if (!borrow) {
      return callback({
        code: 5,
        message: "Borrow record not found",
      });
    }

    bookClient.GetBook({ id: bookId }, (err, book) => {
      if (err) {
        return callback({
          code: 5,
          message: "Book not found",
        });
      }

      bookClient.UpdateAvailability(
        {
          id: bookId,
          availableCopies: book.availableCopies + 1,
        },
        async (err2) => {
          if (err2) {
            return callback({
              code: 13,
              message: "Failed to update book stock",
            });
          }

          await borrow.update({
            status: "RETURNED",
            return_date: new Date(),
          });

          callback(null, {
            id: borrow.id.toString(),
            userId: borrow.user_id,
            bookId: borrow.book_id,
            borrowDate: borrow.borrow_date,
            returnDate: borrow.return_date,
            status: borrow.status,
          });
        }
      );
    });

  } catch (err) {
    callback({
      code: 13,
      message: "Server error",
    });
  }
};

export const GetBorrowsByUser = async (call, callback) => {
  try {
    const borrows = await Borrow.findAll({
      where: { user_id: call.request.userId },
    });

    callback(null, {
      borrows: borrows.map((b) => ({
        id: b.id.toString(),
        userId: b.user_id,
        bookId: b.book_id,
        borrowDate: b.borrow_date,
        returnDate: b.return_date,
        status: b.status,
      })),
    });

  } catch (err) {
    callback({
      code: 13,
      message: "Server error",
    });
  }
};