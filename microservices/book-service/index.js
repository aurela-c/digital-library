import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import bookRoutes from "./routes/bookRoutes.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import { startBookConsumer } from "./consumers/bookConsumer.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/books", bookRoutes);

app.get("/", (req, res) => {
  res.send("Book Service Running");
});

const start = async () => {
  try {
    await sequelize.sync();
    console.log("DB synced");

    await connectRabbitMQ();
    startBookConsumer();

    app.listen(5003, () =>
      console.log("Book service running on 5003")
    );
  } catch (err) {
    console.error(err);
  }
};

start();