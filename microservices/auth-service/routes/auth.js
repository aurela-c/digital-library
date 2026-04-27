import express from "express";
import { register, login } from "../controllers/authController.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many login attempts",
});

router.post("/login", loginLimiter, login);
router.post("/register", register);

export default router;