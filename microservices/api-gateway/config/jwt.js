import { getSecret } from "../../observability/config/secrets.js";

export const ACCESS_SECRET = getSecret("ACCESS_SECRET", "ACCESS_SECRET_KEY");
