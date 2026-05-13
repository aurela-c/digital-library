import pino from "pino";

export function createLogger(serviceName) {
  const level = process.env.LOG_LEVEL || "info";

  return pino({
    name: serviceName,
    level,
    base: { service: serviceName },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    redact: {
      paths: ["req.headers.authorization", "headers.authorization"],
      remove: true,
    },
  });
}
