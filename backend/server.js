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
app.use("/api/auth", authRoutes);
app.use("/api/borrow", borrowRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.send("Digital Library API is running");
});


const startServer = async () => {
  try {
    await sequelize.sync(); 
    console.log("Database synced");
    console.log("Swagger route loaded");

    app.listen(5000, () => console.log("Server running on http://localhost:5000"));
  } catch (err) {
    console.error("Failed to connect to database:", err);
  }
};

startServer();