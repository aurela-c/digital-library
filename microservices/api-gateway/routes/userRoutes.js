import express from "express";
import userClient from "../grpc-clients/userClient.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, allowRoles("ROLE_ADMIN"), (req, res) => {
  userClient.GetAllUsers({}, (err, response) => {
    if (err) return res.status(500).json(err);
    res.json(response.users);
  });
});

router.get(
  "/:id",
  authMiddleware,
  allowRoles("ROLE_USER", "ROLE_ADMIN"),
  (req, res) => {
    userClient.GetUserById({ id: req.params.id }, (err, response) => {
      if (err) return res.status(500).json(err);
      res.json(response);
    });
  }
);

export default router;