import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import { startUserConsumer } from "./consumers/userConsumer.js";
import "./grpc/userServer.js";
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

const logger = createLogger("user-service");
registerProcessHandlers(logger);
const metrics = createMetricsBundle("user-service");

const app = express();

app.use(correlationIdMiddleware);
app.use(metrics.middleware);
app.get("/metrics", metrics.handler);
app.use(createRequestLogMiddleware(logger));

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("User Service Running");
});

app.get(
  "/health",
  createHealthHandler({
    serviceName: "user-service",
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
    startUserConsumer();

    app.listen(5002, () => {
      logger.info({ port: 5002 }, "user-service listening");

      setTimeout(() => {
        registerService("user-service", 5002);
      }, 1500);
    });
  } catch (err) {
    logger.fatal({ err }, "user-service startup failed");
    process.exit(1);
  }
};

start();
