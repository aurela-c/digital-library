import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import "./grpc/borrowServer.js";
import { registerService } from "./src/registerService.js";
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

const logger = createLogger("borrow-service");
registerProcessHandlers(logger);
const metrics = createMetricsBundle("borrow-service");

const app = express();

app.use(correlationIdMiddleware);
app.use(metrics.middleware);
app.get("/metrics", metrics.handler);
app.use(createRequestLogMiddleware(logger));

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Borrow Service Running");
});

app.get(
  "/health",
  createHealthHandler({
    serviceName: "borrow-service",
    checks: [
      {
        key: "database",
        run: async () => {
          await sequelize.authenticate();
          return { ok: true, status: "CONNECTED" };
        },
      },
    ],
  })
);

app.use(notFoundHandler);
app.use(createErrorHandler(logger));

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info("database connected");
    await sequelize.sync();
    logger.info("models synced");

    await connectRabbitMQ();

    app.listen(5004, () => {
      logger.info({ port: 5004 }, "borrow-service listening");

      setTimeout(() => {
        registerService("borrow-service", 5004);
      }, 1500);
    });
  } catch (err) {
    logger.fatal({ err }, "borrow-service startup failed");
    process.exit(1);
  }
};

start();
