import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

export const GATEWAY_URL = (
  process.env.INTEGRATION_GATEWAY_URL ||
  process.env.GATEWAY_URL ||
  "http://127.0.0.1:4000"
).replace(/\/$/, "");

export const ACCESS_SECRET =
  process.env.ACCESS_SECRET || "ACCESS_SECRET_KEY";

export const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "";
export const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "";

export const hasAdminCreds = () =>
  Boolean(TEST_ADMIN_EMAIL && TEST_ADMIN_PASSWORD);
