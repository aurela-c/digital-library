import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import borrowRoutes from "./routes/borrowRoutes.js";
import { connectRabbitMQ } from "./rabbitmq.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/borrow", borrowRoutes);


app.get("/", (req, res) => {
  res.send("Borrow Service Running");
});


const start = async () => {
  try {

    await sequelize.authenticate();
    console.log("DB connected");

    await sequelize.sync();
    console.log("DB synced");

    await connectRabbitMQ();

    app.listen(5004, () => {
      console.log("Borrow service running on port 5004");
    });

  } catch (err) {
    console.error("Startup error:", err);
  }
};

start();