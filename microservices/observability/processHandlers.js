import { useJsonLogs } from "./logger.js";
import { summarizeErr } from "./friendlyErrors.js";

export function registerProcessHandlers(logger) {
  process.on("uncaughtException", (err) => {
    const detail = useJsonLogs()
      ? { message: err.message, stack: err.stack }
      : summarizeErr(err, 6);
    logger.fatal({ err: detail, msg: "uncaughtException" }, err.message);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    const detail =
      reason instanceof Error
        ? useJsonLogs()
          ? { message: reason.message, stack: reason.stack }
          : summarizeErr(reason, 6)
        : { reason: String(reason) };
    logger.error({ msg: "unhandledRejection", err: detail }, "unhandledRejection");
  });
}
