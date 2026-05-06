import express from "express";
import cors from "cors";
import redis from "./redisClient.js";
import { getService } from "./serviceDiscovery.js";
import axios from "axios";
import { securityStack } from "./security/securityStack.js";
const app = express();

// SECURITY STACK
securityStack(app);

// Redis check
redis.ping().then(res => console.log("Redis:", res));

// LOGGING
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


// CACHE MIDDLEWARE
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

// GATEWAY ROUTING (CONSUL)

// AUTH
app.use("/auth", async (req, res) => {
  const url = await getService("auth-service");

  const response = await axios({
    method: req.method,
    url: `${url}${req.originalUrl}`,
    data: req.body,
    headers: req.headers,
  });

  res.status(response.status).json(response.data);
});


// USERS
app.use("/users", async (req, res) => {
  const url = await getService("user-service");

  const response = await axios({
    method: req.method,
    url: `${url}${req.originalUrl}`,
    data: req.body,
    headers: req.headers,
  });

  res.status(response.status).json(response.data);
});


// BOOKS
app.use("/books", async (req, res) => {
  const url = await getService("book-service");

  const response = await axios({
    method: req.method,
    url: `${url}${req.originalUrl}`,
    data: req.body,
    headers: req.headers,
  });

  res.status(response.status).json(response.data);
});


// BORROW
app.use("/borrow", async (req, res) => {
  const url = await getService("borrow-service");

  const response = await axios({
    method: req.method,
    url: `${url}${req.originalUrl}`,
    data: req.body,
    headers: req.headers,
  });

  res.status(response.status).json(response.data);
});


// ROOT
app.get("/", (req, res) => {
  res.send("Gateway (Consul + gRPC + Microservices) 🚀");
});

app.listen(4500, () => {
  console.log("Gateway running on http://localhost:4500");
});