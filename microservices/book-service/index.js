import express from "express";
import cors from "cors";
import { DataTypes } from "sequelize";
import sequelize from "./config/database.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import { startBookConsumer } from "./consumers/bookConsumer.js";
import bookRoutes from "./routes/bookRoutes.js";
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

// NB: do NOT register an inline `app.get("/", ...)` placeholder here.
// The API gateway proxies "/books" to this service and STRIPS the "/books"
// prefix, so the request that arrives is "GET /". A placeholder mounted at
// "/" would match first and shadow `bookRoutes.get("/")` (the catalog
// list), causing the admin dashboard, category pages and the homepage
// "Popular Now" carousel to receive a plain "Service Running" string
// instead of the books array. From the UI side this looked like:
//   - "books exist in DB but don't appear in admin UI"
//   - "category page shows only seed books, never the admin-added ones"
//   - "Popular Now is stuck and can't be toggled"
// All three symptoms were a single bug — a shadowed list route.
// If you need a heartbeat, use `/_status` or `/health` (already defined).
app.get("/_status", (req, res) => {
  res.send("Book Service Running");
});

app.use("/", bookRoutes);

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

/**
 * Safe additive migrations. Sequelize's plain `sync()` will NOT add new
 * columns to existing tables — it only creates tables that don't exist.
 * So whenever the model gains a new column we add it explicitly via
 * `queryInterface.addColumn`, guarded by an existence check so this is
 * idempotent across restarts.
 */
async function ensureSchemaUpToDate() {
  const qi = sequelize.getQueryInterface();
  try {
    const desc = await qi.describeTable("books");
    if (!desc.is_popular) {
      logger.info("Adding missing column books.is_popular");
      await qi.addColumn("books", "is_popular", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  } catch (err) {
    // describeTable throws if the table doesn't exist yet — sequelize.sync()
    // will create it from the model definition (including is_popular).
    logger.warn(
      { event: "ensure_schema_skipped", err: summarizeErr(err, 4) },
      "Could not describe books table; relying on sync() to create it."
    );
  }
}

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info("Database connected");
    await sequelize.sync();
    await ensureSchemaUpToDate();
    logger.info("Models synced");

    const mq = await connectRabbitMQ();
    if (mq) {
      startBookConsumer();
    } else {
      logger.warn("RabbitMQ unavailable — event consumers not started");
    }

    const httpPort = Number(process.env.PORT) || 5003;
    // Bind to "::" so Railway's IPv6-only internal DNS can reach us
    // (see auth-service/index.js for the full explanation). The
    // dual-stack listener also accepts IPv4 connections on Linux.
    app.listen(httpPort, "::", () => {
      logger.info(`HTTP listening on [::]:${httpPort}`);

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
