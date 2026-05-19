import express from "express";
import { authMiddleware } from "../../shared/middleware/authMiddleware.js";
import { allowRoles } from "../../shared/middleware/roleMiddleware.js";
import { requireSelfOrAdmin } from "../../shared/middleware/requireSelfOrAdmin.js";
import { BORROW_ACTOR_ROLES } from "../../shared/constants/roles.js";
import {
  BorrowBook,
  ReturnBook,
  GetBorrowsByUser,
} from "../controllers/borrowController.js";
import { invokeGrpc, sendGrpcError } from "../../shared/utils/grpcHttp.js";

const router = express.Router();

router.post("/", authMiddleware, allowRoles(...BORROW_ACTOR_ROLES), async (req, res) => {
  try {
    const bookId = req.body?.bookId ?? req.body?.book_id;
    if (bookId === undefined || bookId === null || bookId === "") {
      return res.status(400).json({ error: "bookId is required" });
    }

    const response = await invokeGrpc(BorrowBook, {
      userId: String(req.user.id),
      bookId: String(bookId),
    });
    res.json(response);
  } catch (err) {
    sendGrpcError(res, err);
  }
});

router.get("/:id", authMiddleware, requireSelfOrAdmin("id"), async (req, res) => {
  try {
    const response = await invokeGrpc(GetBorrowsByUser, {
      userId: req.params.id,
    });
    res.json(response.borrows);
  } catch (err) {
    sendGrpcError(res, err);
  }
});

router.put(
  "/return/:id",
  authMiddleware,
  allowRoles(...BORROW_ACTOR_ROLES),
  async (req, res) => {
    try {
      const response = await invokeGrpc(ReturnBook, {
        borrowId: req.params.id,
        actorUserId: String(req.user.id),
        actorRole: String(req.user.role || ""),
      });
      res.json(response);
    } catch (err) {
      sendGrpcError(res, err);
    }
  }
);

export default router;
