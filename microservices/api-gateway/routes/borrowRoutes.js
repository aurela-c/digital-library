import express from "express";
import borrowClient from "../grpc-clients/borrowClient.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();
router.post("/", authMiddleware, allowRoles("ROLE_USER"), (req, res) => {
  borrowClient.BorrowBook(
    {
      userId: req.user.id,
      bookId: req.body.bookId,
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
  allowRoles("ROLE_USER", "ROLE_ADMIN"),
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
  allowRoles("ROLE_USER", "ROLE_ADMIN"),
  (req, res) => {
    borrowClient.ReturnBook(
      { borrowId: req.params.id },
      (err, response) => {
        if (err) return res.status(500).json(err);
        res.json(response);
      }
    );
  }
);

export default router;