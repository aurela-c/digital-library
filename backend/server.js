import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import authRoutes from "./routes/auth.js";
import borrowRoutes from "./routes/borrow.js";
import rateLimit from "express-rate-limit";

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 2, 
  message: "You have sent too many requests. Please wait and try again."
});

app.use("/api/auth/login", limiter);
//app.use("/api", limiter);

app.use("/api/auth", authRoutes);
app.use("/api/borrow", borrowRoutes);

app.get("/", (req, res) => {
  res.send("Digital Library API is running");
});

const startServer = async () => {
  try {
    await sequelize.sync(); 
    console.log("Database synced");

    app.listen(5000, () => console.log("Server running on http://localhost:5000"));
  } catch (err) {
    console.error("Failed to connect to database:", err);
  }
};

startServer();