import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import { startBookConsumer } from "./consumers/bookConsumer.js";
import "./grpc/bookServer.js";
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

const logger = createLogger("book-service");
registerProcessHandlers(logger);
const metrics = createMetricsBundle("book-service");

const app = express();

app.use(correlationIdMiddleware);
app.use(metrics.middleware);
app.get("/metrics", metrics.handler);
app.use(createRequestLogMiddleware(logger));

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Book Service Running");
});

app.get(
  "/health",
  createHealthHandler({
    serviceName: "book-service",
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

    const mq = await connectRabbitMQ();
    if (mq) {
      startBookConsumer();
    } else {
      logger.warn("RabbitMQ unavailable — event consumers not started");
    }

    app.listen(5003, () => {
      logger.info({ port: 5003 }, "book-service listening");

      setTimeout(() => {
        registerService("book-service", 5003);
      }, 1500);
    });
  } catch (err) {
    logger.fatal({ err }, "book-service startup failed");
    process.exit(1);
  }
};

start();
