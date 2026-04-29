import express from "express";
import axios from "axios";
import cors from "cors";
import rateLimit from "express-rate-limit";
import redis from "./redisClient.js";
import { createBreaker } from "./circuitBreaker.js";
import jwt from "jsonwebtoken";
import { verifyToken } from "./middleware/authMiddleware.js";

const ACCESS_SECRET = "ACCESS_SECRET_KEY";

const app = express();

//redis check
redis.ping().then(res => console.log("Redis:", res));

//rate limit
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests, try again later",
});

app.use(limiter);

app.use((req, res, next) => {
  console.log("HIT:", req.method, req.url);
  next();
});

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

const cache = async (req, res, next) => {
  if (req.method !== "GET") return next();

  const key = req.originalUrl;

  try {
    const cached = await redis.get(key);

    if (cached) {
      console.log("CACHE HIT:", key);
      return res.json(JSON.parse(cached));
    }

    console.log("CACHE MISS:", key);

    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      if (data) {
        await redis.setex(key, 60, JSON.stringify(data)); // 60 sec cache
      }
      return originalJson(data);
    };

    next();
  } catch (err) {
    console.log("CACHE ERROR:", err.message);
    next();
  }
};

app.use(cache);


const forwardRequest = async (req, res, serviceUrl, stripPrefix = false) => {
  try {
    const url = stripPrefix
      ? `${serviceUrl}${req.originalUrl.replace(req.baseUrl, "")}`
      : `${serviceUrl}${req.originalUrl}`;

    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      headers: {
        Authorization: req.headers.authorization || "",
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });

    return res.status(response.status).json(response.data);

  } catch (err) {
    return res.status(err.response?.status || 500).json({
      error: err.response?.data || "Service error",
    });
  }
};

const bookBreaker = createBreaker("http://localhost:5003/books");

//routes

app.get("/", (req, res) => {
  res.send("API Gateway is running");
});

// AUTH
app.use("/auth", (req, res) =>
  forwardRequest(req, res, "http://localhost:5001")
);

// USERS
app.use("/users", verifyToken, (req, res) =>
  forwardRequest(req, res, "http://localhost:5002")
);

// BOOKS
app.use("/books", async (req, res) => {
  try {
    const result = await bookBreaker.fire({
      method: req.method,
      url: req.originalUrl,
      data: req.body,
      headers: {
        Authorization: req.headers.authorization || "",
        "Content-Type": "application/json",
      },
    });

    return res.json(result);

  } catch (err) {
    return res.status(503).json({
      error: "Book service is unavailable (circuit breaker open)",
    });
  }
});

// BORROW
app.use("/borrow", verifyToken, (req, res) =>
  forwardRequest(req, res, "http://localhost:5004", true)
);

app.listen(4500, () => {
  console.log("Gateway running on http://localhost:4500");
});