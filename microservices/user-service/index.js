import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import { startUserConsumer } from "./consumers/userConsumer.js";
import "./grpc/userServer.js";
import { registerService } from "./src/registerService.js";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("User Service Running");
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "user-service" });
});

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB connected");

    await sequelize.sync();
    console.log("Models synced");

    app.listen(5002, () => {
      console.log("User service running on port 5002");

      setTimeout(() => {
        registerService("user-service", 5002);
      }, 1500);
    });

  } catch (err) {
    console.error("Startup error:", err);
  }
};

start();