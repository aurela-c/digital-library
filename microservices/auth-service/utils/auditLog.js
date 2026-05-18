import { createLogger } from "../../observability/logger.js";

const log = createLogger("auth-service");

export const auditLog = (entry) => {
  const action = entry.action || "audit";
  log.info({ event: "audit", ...entry }, action);
};
