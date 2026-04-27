import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import userRoutes from "./routes/user.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", userRoutes);

app.get("/", (req, res) => {
  res.send("User Service Running");
});

const start = async () => {
  try {
    await sequelize.sync();
    console.log("User DB synced");

    app.listen(5002, () =>
      console.log("User service running on port 5002")
    );
  } catch (err) {
    console.error(err);
  }
};

start();