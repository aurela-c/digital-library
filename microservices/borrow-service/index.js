import express from "express";
import cors from "cors";
import { Op, QueryTypes } from "sequelize";
import sequelize from "./config/database.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import borrowRoutes from "./routes/borrowRoutes.js";
import BorrowedBook from "./models/BorrowedBook.js";
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
  summarizeErr,
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

app.use("/", borrowRoutes);

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

/**
 * Cleanup: remove any borrow rows owned by admin accounts.
 *
 * Background — admins are not allowed to borrow or return books
 * (`BORROW_ACTOR_ROLES = [ROLES.USER, ROLES.LIBRARIAN]`, see
 * `shared/constants/roles.js`). The borrow route + the controller both
 * reject admins with 403 today. But the database may already contain
 * rows created BEFORE that guard was added, which manifest in the user
 * profile as "Admin still has '1984' on loan" and break the catalog's
 * available_copies count.
 *
 * This migration:
 *   1. Reads admin user ids straight from the shared `users` table
 *      (every service points at the same MYSQL_URL).
 *   2. For each admin row with status='BORROWED', bumps the relevant
 *      book's `available_copies` by 1 (clamped to total_copies so the
 *      invariant `available_copies <= total_copies` is preserved).
 *   3. Deletes ALL borrow rows owned by admins, regardless of status.
 *
 * Idempotent — once the table is clean, subsequent restarts are no-ops.
 */
async function cleanupAdminBorrows() {
  try {
    const adminRows = await sequelize.query(
      `SELECT id FROM users
       WHERE UPPER(role) IN ('ROLE_ADMIN', 'ADMIN')`,
      { type: QueryTypes.SELECT }
    );
    const adminIds = adminRows.map((r) => r.id).filter((id) => id != null);

    if (adminIds.length === 0) {
      return;
    }

    // Active loans first — give the books their copy back so the
    // catalog count stays consistent after we delete the rows.
    const activeBorrows = await BorrowedBook.findAll({
      where: {
        user_id: { [Op.in]: adminIds },
        status: "BORROWED",
      },
      attributes: ["id", "book_id"],
    });

    for (const b of activeBorrows) {
      await sequelize.query(
        `UPDATE books
         SET available_copies = LEAST(available_copies + 1, total_copies)
         WHERE id = ?`,
        { replacements: [b.book_id] }
      );
    }

    const deleted = await BorrowedBook.destroy({
      where: { user_id: { [Op.in]: adminIds } },
    });

    if (deleted > 0 || activeBorrows.length > 0) {
      logger.info(
        {
          event: "admin_borrows_cleanup",
          adminUserCount: adminIds.length,
          activeBorrowsRestored: activeBorrows.length,
          rowsDeleted: deleted,
        },
        `Removed ${deleted} stale admin borrow record(s); restored ${activeBorrows.length} book copy/ies`
      );
    }
  } catch (err) {
    logger.warn(
      { event: "admin_borrows_cleanup_failed", err: summarizeErr(err, 4) },
      `Admin borrow cleanup skipped: ${err.message}`
    );
  }
}

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info("Database connected");
    await sequelize.sync();
    await cleanupAdminBorrows();
    logger.info("Models synced");

    await connectRabbitMQ();

    const httpPort = Number(process.env.PORT) || 5004;
    // Bind to "::" so Railway's IPv6-only internal DNS can reach us
    // (see auth-service/index.js for the full explanation). The
    // dual-stack listener also accepts IPv4 connections on Linux.
    app.listen(httpPort, "::", () => {
      logger.info(`HTTP listening on [::]:${httpPort}`);

      setTimeout(() => {
        registerService("borrow-service", httpPort);
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
