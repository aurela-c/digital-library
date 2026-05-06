import express from "express";
import bookClient from "../grpc-clients/bookClient.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

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

router.post("/", authMiddleware, allowRoles("ROLE_ADMIN"), (req, res) => {
  bookClient.AddBook(req.body, (err, response) => {
    if (err) return res.status(500).json(err);
    res.json(response);
  });
});


router.put("/:id", authMiddleware, allowRoles("ROLE_ADMIN"), (req, res) => {
  bookClient.UpdateAvailability(
    { id: req.params.id, ...req.body },
    (err, response) => {
      if (err) return res.status(500).json(err);
      res.json(response);
    }
  );
});

router.delete("/:id", authMiddleware, allowRoles("ROLE_ADMIN"), (req, res) => {
  bookClient.DeleteBook({ id: req.params.id }, (err, response) => {
    if (err) return res.status(500).json(err);
    res.json(response);
  });
});

export default router;