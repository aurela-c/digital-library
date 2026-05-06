import express from "express";
import authClient from "../grpc-clients/authClient.js";
import { authMiddleware, auditLog } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/register", auditLog("USER_REGISTER"), (req, res) => {
  authClient.Register(req.body, (err, response) => {
    if (err) return res.status(400).json(err);
    res.json(response);
  });
});

router.post("/login", auditLog("USER_LOGIN"), (req, res) => {
  authClient.Login(req.body, (err, response) => {
    if (err) return res.status(400).json(err);
    res.json(response);
  });
});

router.post("/refresh", auditLog("TOKEN_REFRESH"), (req, res) => {
  authClient.Refresh(req.body, (err, response) => {
    if (err) return res.status(400).json(err);
    res.json(response);
  });
});

router.get("/verify/:token", (req, res) => {
  authClient.VerifyEmail(
    { token: req.params.token },
    (err, response) => {
      if (err) return res.status(400).json(err);
      res.json(response);
    }
  );
});

router.post("/reset-request", (req, res) => {
  authClient.RequestReset(req.body, (err, response) => {
    if (err) return res.status(400).json(err);
    res.json(response);
  });
});

router.post("/reset/:token", (req, res) => {
  authClient.ResetPassword(
    { token: req.params.token, password: req.body.password },
    (err, response) => {
      if (err) return res.status(400).json(err);
      res.json(response);
    }
  );
});

router.get(
  "/:id",
  authMiddleware,
  auditLog("GET_USER_BY_ID"),
  (req, res) => {
    if (
      req.user.role !== "ROLE_ADMIN" &&
      req.user.id != req.params.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    authClient.GetUserById({ id: req.params.id }, (err, response) => {
      if (err) return res.status(500).json(err);
      res.json(response);
    });
  }
);

router.get(
  "/admin",
  authMiddleware,
  auditLog("ADMIN_ACCESS"),
  allowRoles("ROLE_ADMIN"),
  (req, res) => {
    res.json({ message: "Admin only" });
  }
);

router.get(
  "/profile",
  authMiddleware,
  auditLog("VIEW_PROFILE"),
  allowRoles("ROLE_ADMIN", "ROLE_USER"),
  (req, res) => {
    res.json({ message: "User profile access" });
  }
);

export default router;