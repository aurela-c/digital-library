import express from "express";
import { authMiddleware } from "../../shared/middleware/authMiddleware.js";
import { allowRoles } from "../../shared/middleware/roleMiddleware.js";
import { requireSelfOrAdmin } from "../../shared/middleware/requireSelfOrAdmin.js";
import { ROLES } from "../../shared/constants/roles.js";
import { GetAllUsers, GetUserById } from "../controllers/userController.js";
import { invokeGrpc, sendGrpcError } from "../../shared/utils/grpcHttp.js";

const router = express.Router();

router.get("/", authMiddleware, allowRoles(ROLES.ADMIN), async (req, res) => {
  try {
    const response = await invokeGrpc(GetAllUsers, {});
    res.json(response.users);
  } catch (err) {
    sendGrpcError(res, err);
  }
});

router.get("/:id", authMiddleware, requireSelfOrAdmin("id"), async (req, res) => {
  try {
    const response = await invokeGrpc(GetUserById, { id: req.params.id });
    res.json(response);
  } catch (err) {
    sendGrpcError(res, err);
  }
});

export default router;
