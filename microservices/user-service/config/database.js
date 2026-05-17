import dotenv from "dotenv";
import { createSequelize } from "../../observability/config/database.js";

dotenv.config({ quiet: true });

const sequelize = createSequelize();

export default sequelize;
