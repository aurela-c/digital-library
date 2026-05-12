/**
 * Global process-level logging for uncaught errors (process still exits on uncaughtException by default).
 */
export function registerProcessHandlers(logger) {
  process.on("uncaughtException", (err) => {
    logger.fatal(
      { err: { message: err.message, stack: err.stack }, msg: "uncaughtException" },
      err.message
    );
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    const detail =
      reason instanceof Error
        ? { message: reason.message, stack: reason.stack }
        : { reason: String(reason) };
    logger.error({ msg: "unhandledRejection", err: detail }, "unhandledRejection");
  });
}
