import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";

import authRoutes from "./routes/auth.js";
import borrowRoutes from "./routes/borrow.js";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/borrow", borrowRoutes);

app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.url);
  next();
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log("AUTH ROUTES:", authRoutes);
console.log("BORROW ROUTES:", borrowRoutes);

app.get("/", (req, res) => {
  res.send("Digital Library API is running");
});

const startServer = async () => {
  try {
    await sequelize.sync();
    console.log("Database synced");

    app.listen(5000, () =>
      console.log("Server running on http://localhost:5000")
    );
  } catch (err) {
    console.error("DB ERROR:", err);
  }
};

startServer();