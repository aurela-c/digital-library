import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log(" GATEWAY HIT:", req.method, req.url);
  next();
});

app.get("/auth/test", (req, res) => {
  res.json({ source: "API-GATEWAY" });
});

// AUTH
app.use("/auth", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:5001${req.url}`, 
      data: req.body,
    });

    res.json(response.data);
  } catch (err) {
    console.log("AUTH ERROR:", err.message);
    res.status(500).json({ error: "Auth error" });
  }
});

// USERS
app.use("/users", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:5002${req.originalUrl.replace("/users", "")}`,
      data: req.body,
    });
    res.json(response.data);
  } catch {
    res.status(500).json({ error: "User error" });
  }
});

// BOOKS
app.use("/books", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:5003${req.originalUrl.replace("/books", "")}`,
      data: req.body,
    });
    res.json(response.data);
  } catch {
    res.status(500).json({ error: "Book error" });
  }
});

app.use((req, res, next) => {
  console.log("GATEWAY HIT:", req.method, req.url);
  next();
});

app.listen(4000, () => console.log("Gateway on 4000"));
