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
  updateBookHttp,
} from "../controllers/bookController.js";
import { invokeGrpc, sendGrpcError } from "../../shared/utils/grpcHttp.js";

const router = express.Router();

/**
 * GET /books — list books. Supports optional filters via query string
 * (forwarded straight through to the gRPC handler):
 *   ?categoryId=1      filter by category
 *   ?author=NAME       filter by exact author
 *   ?title=substring   case-insensitive LIKE match
 *   ?page / ?limit     pagination
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const grpcArgs = {};
    if (req.query.categoryId) grpcArgs.categoryId = String(req.query.categoryId);
    if (req.query.author) grpcArgs.author = String(req.query.author);
    if (req.query.title) grpcArgs.title = String(req.query.title);
    if (req.query.page) grpcArgs.page = String(req.query.page);
    if (req.query.limit) grpcArgs.limit = String(req.query.limit);

    const response = await invokeGrpc(GetAllBooks, grpcArgs);
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

/**
 * PUT /books/:id  — admin full-field update (title, author, image,
 * description, categoryId, totalCopies, availableCopies). Goes
 * straight to the DB; we intentionally do NOT call the gRPC
 * `UpdateAvailability` RPC here because that RPC only knows how to
 * change availableCopies and is still used by borrow-service.
 *
 * PATCH /books/:id  — identical handler; PATCH alias is provided so
 * partial updates feel natural for API consumers.
 */
router.put(
  "/:id",
  authMiddleware,
  allowRoles(...STAFF_BOOK_ROLES),
  updateBookHttp
);
router.patch(
  "/:id",
  authMiddleware,
  allowRoles(...STAFF_BOOK_ROLES),
  updateBookHttp
);

/**
 * POST /books/:id/availability  — internal endpoint that still routes
 * through the gRPC `UpdateAvailability` RPC. We keep this so any
 * existing tooling that depended on the gRPC validation/limits keeps
 * a working HTTP entry point.
 */
router.post(
  "/:id/availability",
  authMiddleware,
  allowRoles(...STAFF_BOOK_ROLES),
  async (req, res) => {
    try {
      const response = await invokeGrpc(UpdateAvailability, {
        id: req.params.id,
        ...req.body,
      });
      res.json(response);
    } catch (err) {
      sendGrpcError(res, err);
    }
  }
);

router.delete("/:id", authMiddleware, allowRoles(...STAFF_BOOK_ROLES), async (req, res) => {
  try {
    const response = await invokeGrpc(DeleteBook, { id: req.params.id });
    res.json(response);
  } catch (err) {
    sendGrpcError(res, err);
  }
});

export default router;
