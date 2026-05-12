import express from "express";
import borrowClient from "../grpc-clients/borrowClient.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { requireSelfOrAdmin } from "../middleware/requireSelfOrAdmin.js";
import { BORROW_ACTOR_ROLES } from "../constants/roles.js";

const router = express.Router();

router.post("/", authMiddleware, allowRoles(...BORROW_ACTOR_ROLES), (req, res) => {
  const bookId = req.body?.bookId ?? req.body?.book_id;
  if (bookId === undefined || bookId === null || bookId === "") {
    return res.status(400).json({ error: "bookId is required" });
  }

  borrowClient.BorrowBook(
    {
      userId: String(req.user.id),
      bookId: String(bookId),
    },
    (err, response) => {
      if (err) return res.status(500).json(err);
      res.json(response);
    }
  );
});

router.get(
  "/:id",
  authMiddleware,
  requireSelfOrAdmin("id"),
  (req, res) => {
    borrowClient.GetBorrowsByUser(
      { userId: req.params.id },
      (err, response) => {
        if (err) return res.status(500).json(err);
        res.json(response.borrows);
      }
    );
  }
);

router.put(
  "/return/:id",
  authMiddleware,
  allowRoles(...BORROW_ACTOR_ROLES),
  (req, res) => {
    borrowClient.ReturnBook(
      {
        borrowId: req.params.id,
        actorUserId: String(req.user.id),
        actorRole: String(req.user.role || ""),
      },
      (err, response) => {
        if (err) return res.status(500).json(err);
        res.json(response);
      }
    );
  }
);

export default router;