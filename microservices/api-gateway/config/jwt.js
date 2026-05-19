import { getSecret } from "../../observability/config/secrets.js";

/** @deprecated JWT verification runs in microservices via shared/middleware/authMiddleware.js */
export const ACCESS_SECRET = getSecret("ACCESS_SECRET", "ACCESS_SECRET_KEY");
