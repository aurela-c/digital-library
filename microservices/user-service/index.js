import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import { startUserConsumer } from "./consumers/userConsumer.js";
import userRoutes from "./routes/userRoutes.js";
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
  summarizeErr,
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

app.use("/", userRoutes);

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
    logger.info("Database connected");
    await sequelize.sync();
    logger.info("Models synced");

    const mq = await connectRabbitMQ();
    if (mq) {
      startUserConsumer();
    } else {
      logger.warn("RabbitMQ unavailable — event consumers not started");
    }

    const httpPort = Number(process.env.PORT) || 5002;
    app.listen(httpPort, () => {
      logger.info(`HTTP listening on port ${httpPort}`);

      setTimeout(() => {
        registerService("user-service", httpPort);
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
