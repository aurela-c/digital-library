import express from "express";
import { authMiddleware } from "../../shared/middleware/authMiddleware.js";
import { allowRoles } from "../../shared/middleware/roleMiddleware.js";
import { STAFF_BOOK_ROLES } from "../../shared/constants/roles.js";
import {
  GetAllBooks,
  GetBook,
  AddBook,
  UpdateAvailability,
  DeleteBook,
} from "../controllers/bookController.js";
import { invokeGrpc, sendGrpcError } from "../../shared/utils/grpcHttp.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const response = await invokeGrpc(GetAllBooks, {});
    res.json(response.books);
  } catch (err) {
    sendGrpcError(res, err);
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const response = await invokeGrpc(GetBook, { id: req.params.id });
    res.json(response);
  } catch (err) {
    sendGrpcError(res, err);
  }
});

router.post("/", authMiddleware, allowRoles(...STAFF_BOOK_ROLES), async (req, res) => {
  try {
    const response = await invokeGrpc(AddBook, req.body);
    res.json(response);
  } catch (err) {
    sendGrpcError(res, err);
  }
});

router.put("/:id", authMiddleware, allowRoles(...STAFF_BOOK_ROLES), async (req, res) => {
  try {
    const response = await invokeGrpc(UpdateAvailability, {
      id: req.params.id,
      ...req.body,
    });
    res.json(response);
  } catch (err) {
    sendGrpcError(res, err);
  }
});

router.delete("/:id", authMiddleware, allowRoles(...STAFF_BOOK_ROLES), async (req, res) => {
  try {
    const response = await invokeGrpc(DeleteBook, { id: req.params.id });
    res.json(response);
  } catch (err) {
    sendGrpcError(res, err);
  }
});

export default router;
