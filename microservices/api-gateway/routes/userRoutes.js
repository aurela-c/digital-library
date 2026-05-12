import express from "express";
import userClient from "../grpc-clients/userClient.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { requireSelfOrAdmin } from "../middleware/requireSelfOrAdmin.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

router.get("/", authMiddleware, allowRoles(ROLES.ADMIN), (req, res) => {
  userClient.GetAllUsers({}, (err, response) => {
    if (err) return res.status(500).json(err);
    res.json(response.users);
  });
});

router.get(
  "/:id",
  authMiddleware,
  requireSelfOrAdmin("id"),
  (req, res) => {
    userClient.GetUserById({ id: req.params.id }, (err, response) => {
      if (err) return res.status(500).json(err);
      res.json(response);
    });
  }
);

export default router;