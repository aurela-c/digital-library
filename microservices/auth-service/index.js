import express from "express";
import sequelize from "./config/database.js";
import dotenv from "dotenv";
import { registerService } from "./src/registerService.js";
dotenv.config();

const app = express();
app.use(express.json());

// ROUTES
app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "auth-service" });
});

// START SERVICE
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB connected");

    await sequelize.sync();
    console.log("Models synced");

    app.listen(5001, () => {
      console.log("Auth service running on port 5001");

      setTimeout(() => {
        registerService("auth-service", 5001);
      }, 1500);
    });

  } catch (err) {
    console.error("Startup error:", err);
  }
};

start();