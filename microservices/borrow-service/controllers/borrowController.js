import BorrowedBook from "../models/BorrowedBook.js";
import Joi from "joi";
import { getChannel } from "../rabbitmq.js";

const schema = Joi.object({
  userId: Joi.number().required(),
  bookId: Joi.number().required(),
});

//borrow
export const borrowBook = async (req, res) => {
  try {
    const { userId, bookId } = req.body;

    const { error } = schema.validate({ userId, bookId });
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const exists = await BorrowedBook.findOne({
      where: {
        user_id: userId,
        book_id: bookId,
        status: "borrowed",
      },
    });

    if (exists) {
      return res.status(400).json({ error: "Already borrowed this book" });
    }

    const borrow = await BorrowedBook.create({
      user_id: userId,
      book_id: bookId,
      status: "borrowed",
    });
    const channel = getChannel();

    channel.sendToQueue(
      "BOOK_BORROWED",
      Buffer.from(
        JSON.stringify({
          userId,
          bookId,
          borrowId: borrow.id,
        })
      )
    );

    console.log("EVENT SENT: BOOK_BORROWED", { userId, bookId });

    return res.status(201).json({
      message: "Book borrowed successfully",
      borrow,
    });

  } catch (err) {
    console.error("Borrow error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

//get user books
export const getBorrows = async (req, res) => {
  try {
    const userId = req.params.id;

    const data = await BorrowedBook.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
    });

    return res.json(data);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

//return
export const returnBook = async (req, res) => {
  try {
    const borrow = await BorrowedBook.findByPk(req.params.id);

    if (!borrow) {
      return res.status(404).json({ error: "Borrow record not found" });
    }

    if (borrow.status === "returned") {
      return res.status(400).json({ error: "Book already returned" });
    }


    await borrow.update({
      status: "returned",
      return_date: new Date(),
    });

    const channel = getChannel();

    channel.sendToQueue(
      "BOOK_RETURNED",
      Buffer.from(
        JSON.stringify({
          userId: borrow.user_id,
          bookId: borrow.book_id,
          borrowId: borrow.id,
        })
      )
    );

    console.log("EVENT SENT: BOOK_RETURNED", {
      userId: borrow.user_id,
      bookId: borrow.book_id,
    });

    return res.json({
      message: "Book returned successfully",
      borrow,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};