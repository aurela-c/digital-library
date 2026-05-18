import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import dotenv from "dotenv";
import { registerService } from "./src/registerService.js";
import authRoutes from "./routes/authRoutes.js";
import { printExpressStack } from "./utils/printRoutes.js";
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
  summarizeErr,
  formatGrpcBindError,
} from "../observability/index.js";

dotenv.config({ quiet: true });

const logger = createLogger("auth-service");
registerProcessHandlers(logger);
const metrics = createMetricsBundle("auth-service");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

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
    logger.info("Database connected (users table — no ORM sync)");

    const { startAuthGrpcServer } = await import("./grpc/authServer.js");
    await startAuthGrpcServer(logger);

    const httpPort = Number(process.env.PORT) || 5001;

    app.listen(httpPort, () => {
      logger.info(`HTTP listening on port ${httpPort}`);
      printExpressStack(app, "auth-service");

      setTimeout(() => {
        registerService("auth-service", httpPort);
      }, 1500);
    });
  } catch (err) {
    const grpcPort = Number(process.env.AUTH_GRPC_PORT || 5010);
    const msg = String(err?.message || err);

    const grpcBind =
      /No address added|EADDRINUSE|listen EADDRINUSE|already in use/i.test(msg);

    const human = grpcBind
      ? formatGrpcBindError(grpcPort, err)
      : msg.split("\n")[0];

    logger.fatal(
      { err: summarizeErr(err, grpcBind ? 0 : 6), event: "startup_failed" },
      `Startup failed: ${human}`
    );

    process.exit(1);
  }
};

start();