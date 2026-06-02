import express from "express";
import cors from "cors";
import { DataTypes } from "sequelize";
import sequelize from "./config/database.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import { startUserConsumer } from "./consumers/userConsumer.js";
import userRoutes from "./routes/userRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
// Models — imported for side effects so sequelize.sync() creates the tables.
import "./models/SupportTicket.js";
import "./models/SupportTicketReply.js";
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

// NB: do NOT register an inline `app.get("/", ...)` placeholder here.
// The API gateway proxies "/users" to this service and STRIPS the "/users"
// prefix, so the request that arrives is "GET /". A placeholder mounted at
// "/" would match first and shadow `userRoutes.get("/")` (the admin user
// list), causing the admin dashboard to receive a plain "Service Running"
// string instead of the user array — which then collapses the User
// Management table to empty and breaks search.
// If you need a heartbeat, use `/_status` or `/health` (already defined).
app.get("/_status", (req, res) => {
  res.send("User Service Running");
});

// Mount support BEFORE the user router so `/tickets*` is matched first
// (userRoutes contains a catch-all `/:id` GET that would otherwise swallow
// "/tickets" as an id).
//
// IMPORTANT: the API gateway proxies "/support/*" to this service and STRIPS
// the "/support" prefix before forwarding (see api-gateway/utils/serviceHttpProxy.js).
// So the request that arrives here looks like "/tickets", "/tickets/me",
// "/tickets/:id" — NOT "/support/tickets". That's why supportRoutes is
// mounted at "/" (matching the other routers in this service) instead of
// "/support". Mounting at "/support" caused every support request to 404.
app.use("/", supportRoutes);

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

/**
 * Safe additive migrations for the `users` table.
 *
 * History note — the original DB schema declared:
 *   role           ENUM('user','admin')
 *   account_status ENUM('active','blocked')
 *
 * The application code, however, writes the canonical strings
 *   role           'ROLE_USER' | 'ROLE_ADMIN' | 'ROLE_LIBRARIAN'
 *   account_status 'ACTIVE'    | 'INACTIVE'  | 'BANNED'
 *
 * On MySQL non-strict mode the ENUM silently truncates anything not in
 * its value set to '' — so admin promotions and bans appeared to "save"
 * (200 OK) but the column actually ended up empty in the database. The
 * symptoms reported in the dashboard ("role change doesn't grant admin
 * privileges", "ban isn't persisted", "INACTIVE shows up as ACTIVE")
 * all trace back to that single bug.
 *
 * This migration is idempotent: once columns are VARCHAR + values are
 * canonical, subsequent restarts are no-ops.
 */
async function ensureUserSchemaUpToDate() {
  const qi = sequelize.getQueryInterface();
  try {
    const desc = await qi.describeTable("users");

    const isEnum = (col) => col && /enum/i.test(String(col.type || ""));

    if (isEnum(desc.role)) {
      logger.info("users.role is ENUM — converting to VARCHAR(50)");
      await qi.changeColumn("users", "role", {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "ROLE_USER",
      });
    }

    if (isEnum(desc.account_status)) {
      logger.info(
        "users.account_status is ENUM — converting to VARCHAR(16)"
      );
      await qi.changeColumn("users", "account_status", {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "ACTIVE",
      });
    }

    // Normalise legacy / truncated values to the canonical vocabulary.
    // Running these UPDATEs again on already-canonical data is a no-op,
    // so it's safe to execute on every startup.
    const [roleResult] = await sequelize.query(`
      UPDATE users
      SET role = CASE
        WHEN UPPER(role) IN ('ROLE_ADMIN', 'ADMIN') THEN 'ROLE_ADMIN'
        WHEN UPPER(role) IN ('ROLE_LIBRARIAN', 'LIBRARIAN') THEN 'ROLE_LIBRARIAN'
        ELSE 'ROLE_USER'
      END
      WHERE role IS NULL
         OR role = ''
         OR role NOT IN ('ROLE_USER', 'ROLE_ADMIN', 'ROLE_LIBRARIAN')
    `);

    const [statusResult] = await sequelize.query(`
      UPDATE users
      SET account_status = CASE
        WHEN UPPER(account_status) IN ('BANNED', 'BLOCKED') THEN 'BANNED'
        WHEN UPPER(account_status) = 'INACTIVE' THEN 'INACTIVE'
        ELSE 'ACTIVE'
      END
      WHERE account_status IS NULL
         OR account_status = ''
         OR account_status NOT IN ('ACTIVE', 'INACTIVE', 'BANNED')
    `);

    logger.info(
      {
        event: "users_schema_normalised",
        roleResult,
        statusResult,
      },
      "users.role / users.account_status normalisation complete"
    );
  } catch (err) {
    // describeTable throws if the table doesn't exist yet — sequelize.sync()
    // will create it from the model definition (already VARCHAR). The
    // UPDATE statements would also fail in that case, which we tolerate.
    logger.warn(
      { event: "users_schema_migration_skipped", err: summarizeErr(err, 4) },
      `users schema migration skipped: ${err.message}`
    );
  }
}

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info("Database connected");
    await sequelize.sync();
    await ensureUserSchemaUpToDate();
    logger.info("Models synced");

    const mq = await connectRabbitMQ();
    if (mq) {
      startUserConsumer();
    } else {
      logger.warn("RabbitMQ unavailable — event consumers not started");
    }

    const httpPort = Number(process.env.PORT) || 5002;
    // Explicit 0.0.0.0 bind — see auth-service/index.js for rationale.
    app.listen(httpPort, "0.0.0.0", () => {
      logger.info(`HTTP listening on 0.0.0.0:${httpPort}`);

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
