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
        // SMTP is non-critical for liveness: if Gmail is briefly unreachable
        // (e.g. PaaS egress hiccup) we still want the container to stay up
        // and keep serving login / refresh / profile traffic. The health
        // payload still reports the real SMTP status as DEGRADED.
        critical: false,
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

/**
 * Idempotent schema-healing migration.
 *
 * The `users` table was originally created with a subset of the columns
 * the Sequelize User model declares. Any missing column (e.g.
 * `verification_token`, `reset_password_token`, `reset_password_expires`,
 * `profile_image`, `account_status`) makes Sequelize's auto-generated
 * `SELECT * FROM users` fail at request time with a cryptic "Unknown
 * column" 5xx — which is exactly what blocks /auth/register, /auth/login,
 * and every downstream flow.
 *
 * Each ADD COLUMN is wrapped in its own try/catch and the resulting
 * error is ignored when MySQL reports "Duplicate column name" (ER_DUP_FIELDNAME),
 * so this function is safe to call on every startup against any
 * schema state.
 */
const ensureUserSchemaUpToDate = async () => {
  const qi = sequelize.getQueryInterface();
  const dialect = sequelize.getDialect();

  const wantedColumns = [
    { name: "verification_token", ddl: "VARCHAR(512) NULL" },
    { name: "reset_password_token", ddl: "VARCHAR(255) NULL" },
    { name: "reset_password_expires", ddl: "DATETIME NULL" },
    { name: "profile_image", ddl: "VARCHAR(255) NULL" },
    { name: "account_status", ddl: "VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'" },
    { name: "is_verified", ddl: "TINYINT(1) NULL DEFAULT 0" },
  ];

  let existing = new Set();
  try {
    const desc = await qi.describeTable("users");
    existing = new Set(Object.keys(desc || {}));
  } catch (err) {
    logger.warn(
      `ensureUserSchemaUpToDate: describeTable failed (${err.message}); will attempt ADDs anyway`
    );
  }

  for (const col of wantedColumns) {
    if (existing.has(col.name)) continue;
    try {
      await sequelize.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.ddl}`);
      logger.info(`ensureUserSchemaUpToDate: added column users.${col.name}`);
    } catch (err) {
      const msg = String(err?.original?.message || err?.message || "");
      if (/Duplicate column name/i.test(msg)) continue;
      logger.warn(
        `ensureUserSchemaUpToDate: could not add users.${col.name} (${msg}); continuing`
      );
    }
  }

  if (dialect !== "mysql") {
    // Only MySQL/MariaDB tested; other dialects keep working but skip the
    // explicit ALTER pass — Sequelize sync would handle them on its own.
    return;
  }
};

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info("Database connected (users table — no ORM sync)");

    // Self-heal the schema BEFORE the first request lands. Safe to run
    // every startup; no-op once every column is present.
    await ensureUserSchemaUpToDate();

    // Probe SMTP at startup so missing/invalid credentials are visible
    // immediately, not after the first registration attempt.
    try {
      const smtp = await verifyEmailTransport();
      logger.info({ smtp }, `SMTP status: ${smtp.status}`);
    } catch (e) {
      logger.warn(`SMTP probe threw: ${e.message}`);
    }

    const { startAuthGrpcServer } = await import("./grpc/authServer.js");
    await startAuthGrpcServer(logger);

    const httpPort = Number(process.env.PORT) || 5001;

    // Explicit 0.0.0.0 bind so the process is reachable from the
    // container network. Node defaults to dual-stack on Linux but this
    // makes the intent obvious and is required by the docker compose
    // health/scrape model.
    // Bind to "::" (IPv6 dual-stack). On Linux this also accepts IPv4
    // connections via IPv4-mapped IPv6 addresses, AND lets Railway's
    // internal DNS (which resolves *.railway.internal to AAAA records
    // only) reach this service. Binding to "0.0.0.0" alone would make
    // every internal service-to-service HTTP call time out on Railway.
    app.listen(httpPort, "::", () => {
      logger.info(`HTTP listening on [::]:${httpPort}`);
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