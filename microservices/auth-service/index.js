import express from "express";
import sequelize from "./config/database.js";
import dotenv from "dotenv";
import { registerService } from "./src/registerService.js";
import authRoutes from "./routes/authRoutes.js";
import { printExpressStack } from "./utils/printRoutes.js";
import "./models/associations.js";
import { verifyEmailTransport } from "./utils/emailService.js";
import {
  createLogger,
  registerProcessHandlers,
  correlationIdMiddleware,
  createMetricsBundle,
  createRequestLogMiddleware,
  createHealthHandler,
  createErrorHandler,
  notFoundHandler,
} from "../observability/index.js";

dotenv.config();

const logger = createLogger("auth-service");
registerProcessHandlers(logger);
const metrics = createMetricsBundle("auth-service");

const app = express();

app.use(correlationIdMiddleware);
app.use(metrics.middleware);
app.get("/metrics", metrics.handler);
app.use(createRequestLogMiddleware(logger));

app.use(express.json());
app.use("/auth", authRoutes);

app.get(
  "/health",
  createHealthHandler({
    serviceName: "auth-service",
    checks: [
      {
        key: "database",
        run: async () => {
          await sequelize.authenticate();
          return { ok: true, status: "CONNECTED" };
        },
      },
      {
        key: "email",
        run: async () => {
          try {
            return await verifyEmailTransport();
          } catch (e) {
            return { ok: false, status: `DOWN (${e.message})` };
          }
        },
      },
    ],
  })
);

app.get("/", (req, res) => {
  res.send("Auth Service Running");
});

app.use(notFoundHandler);
app.use(createErrorHandler(logger));

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info("database connection established");
    await sequelize.sync();
    logger.info("sequelize models synced");

    const { startAuthGrpcServer } = await import("./grpc/authServer.js");
    await startAuthGrpcServer(logger);

    app.listen(5001, () => {
      logger.info({ port: 5001 }, "auth-service listening");
      printExpressStack(app, "auth-service");

      setTimeout(() => {
        registerService("auth-service", 5001);
      }, 1500);
    });
  } catch (err) {
    logger.fatal({ err }, "auth-service startup failed");
    process.exit(1);
  }
};

start();
