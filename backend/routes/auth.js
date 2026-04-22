import express from "express";
import { register, login, getUserById  } from "../controllers/authController.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many login attempts"
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user and return JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@test.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

router.post("/login",loginLimiter, login);

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post("/register", register);


export default router;