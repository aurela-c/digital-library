import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import borrowRoutes from "./routes/borrowRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use("/borrow", borrowRoutes);

// health check
app.get("/", (req, res) => {
  res.send("Borrow Service Running");
});

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB connected");

    await sequelize.sync();

    app.listen(5004, () =>
      console.log("Borrow service running on port 5004")
    );
  } catch (err) {
    console.error(err);
  }
};

start();