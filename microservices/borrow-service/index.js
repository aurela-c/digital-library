import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import "./grpc/borrowServer.js";
import { registerService } from "./src/registerService.js";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Borrow Service Running");
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "borrow-service" });
});

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB connected");

    await sequelize.sync();
    console.log("Models synced");

    app.listen(5004, () => {
      console.log("Borrow service running on port 5004");

      setTimeout(() => {
        registerService("borrow-service", 5004);
      }, 1500);
    });

  } catch (err) {
    console.error("Startup error:", err);
  }
};

start();