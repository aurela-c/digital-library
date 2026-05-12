import { createLogger } from "../../observability/logger.js";

const log = createLogger("auth-service");

export const auditLog = (entry) => {
  log.info({ msg: "audit", ...entry }, "audit_event");
};
