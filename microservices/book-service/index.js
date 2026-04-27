import express from "express";
import sequelize from "./config/database.js";
import borrowRoutes from "./routes/borrow.js";

const app = express();
app.use(express.json());

app.use("/", borrowRoutes);

app.get("/", (req, res) => {
  res.send("Book Service Running");
});

sequelize.sync().then(() => {
  console.log("Book DB connected");
  app.listen(5003, () => console.log("Book service on 5003"));
});