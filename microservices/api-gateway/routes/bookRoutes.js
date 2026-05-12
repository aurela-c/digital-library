import express from "express";
import bookClient from "../grpc-clients/bookClient.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { STAFF_BOOK_ROLES } from "../constants/roles.js";

const router = express.Router();

router.get("/", authMiddleware, (req, res) => {
  bookClient.GetAllBooks({}, (err, response) => {
    if (err) return res.status(500).json(err);
    res.json(response.books);
  });
});

router.get("/:id", authMiddleware, (req, res) => {
  bookClient.GetBook({ id: req.params.id }, (err, response) => {
    if (err) return res.status(500).json(err);
    res.json(response);
  });
});

router.post("/", authMiddleware, allowRoles(...STAFF_BOOK_ROLES), (req, res) => {
  bookClient.AddBook(req.body, (err, response) => {
    if (err) return res.status(500).json(err);
    res.json(response);
  });
});


router.put("/:id", authMiddleware, allowRoles(...STAFF_BOOK_ROLES), (req, res) => {
  bookClient.UpdateAvailability(
    { id: req.params.id, ...req.body },
    (err, response) => {
      if (err) return res.status(500).json(err);
      res.json(response);
    }
  );
});

router.delete(
  "/:id",
  authMiddleware,
  allowRoles(...STAFF_BOOK_ROLES),
  (req, res) => {
    bookClient.DeleteBook({ id: req.params.id }, (err, response) => {
      if (err) return res.status(500).json(err);
      res.json(response);
    });
  }
);

export default router;