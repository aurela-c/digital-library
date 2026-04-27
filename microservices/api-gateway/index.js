import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors()); 

app.use(express.json());

// auth
app.use("/auth", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:5001${req.originalUrl.replace("/auth", "")}`,
      data: req.body,
      headers: { ...req.headers },
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: err.response?.data || "Auth service error",
    });
  }
});

// user
app.use("/users", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:5002${req.originalUrl.replace("/users", "")}`,
      data: req.body,
      headers: { ...req.headers },
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: err.response?.data || "User service error",
    });
  }
});

// books
app.use("/books", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:5003${req.originalUrl.replace("/books", "")}`,
      data: req.body,
      headers: { ...req.headers },
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: err.response?.data || "Book service error",
    });
  }
});

// borrow
app.use("/borrow", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:5004${req.originalUrl.replace("/borrow", "")}`,
      data: req.body,
      headers: { ...req.headers },
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: err.response?.data || "Borrow service error",
    });
  }
});

//test
app.get("/test", (req, res) => {
  res.json({ message: "API Gateway Working" });
});

app.listen(4000, () =>
  console.log("Gateway running on http://localhost:4000")
);