import express from "express";
import sequelize from "./config/database.js";
import authRoutes from "./routes/auth.js";

const app = express();
app.use(express.json());

app.use("/", authRoutes);

app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB connected");

    await sequelize.sync();
    console.log("Models synced");

    app.listen(5001, () => {
      console.log("Auth service running on port 5001");
    });
  } catch (err) {
    console.error("Startup error:", err);
  }
};

start();