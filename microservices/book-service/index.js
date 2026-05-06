import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import { startBookConsumer } from "./consumers/bookConsumer.js";
import "./grpc/bookServer.js";
import { registerService } from "./src/registerService.js";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Book Service Running");
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "book-service" });
});

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB connected");

    await sequelize.sync();
    console.log("Models synced");

    app.listen(5003, () => {
      console.log("Book service running on port 5003");

      setTimeout(() => {
        registerService("book-service", 5003);
      }, 1500);
    });

  } catch (err) {
    console.error("Startup error:", err);
  }
};

start();