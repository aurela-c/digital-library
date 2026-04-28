import express from "express";
import { register, login } from "../controllers/authController.js";
import { getUserById } from "../controllers/authController.js";

const router = express.Router();


router.post("/login", login);
router.post("/register", register);
router.get("/:id", getUserById);

export default router;