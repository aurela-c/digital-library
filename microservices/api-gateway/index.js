import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import redis from "./redisClient.js";

//  IMPORT ROUTES (gRPC-based)
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import borrowRoutes from "./routes/borrowRoutes.js";

const app = express();

// Redis check
redis.ping().then(res => console.log("Redis:", res));

// Rate limit
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests, try again later",
});
app.use(limiter);

// Logging
app.use((req, res, next) => {
  console.log("HIT:", req.method, req.url);
  next();
});

// CORS
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());


//  CACHE 
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
        await redis.setex(key, 60, JSON.stringify(data));
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


//  ROUTES (gRPC)
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/books", bookRoutes);
app.use("/borrow", borrowRoutes);


// TEST
app.get("/", (req, res) => {
  res.send("Gateway (gRPC) running 🚀");
});

app.listen(4500, () => {
  console.log("Gateway running on http://localhost:4500");
});