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
  summarizeErr,
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
    logger.info("Database connected");
    await sequelize.sync();
    logger.info("Models synced");

    const mq = await connectRabbitMQ();
    if (mq) {
      startBookConsumer();
    } else {
      logger.warn("RabbitMQ unavailable — event consumers not started");
    }

    const httpPort = Number(process.env.PORT) || 5003;
    app.listen(httpPort, () => {
      logger.info(`HTTP listening on port ${httpPort}`);

      setTimeout(() => {
        registerService("book-service", httpPort);
      }, 1500);
    });
  } catch (err) {
    logger.fatal(
      { err: summarizeErr(err, 8), event: "startup_failed" },
      `Startup failed: ${err?.message || err}`
    );
    process.exit(1);
  }
};

start();
