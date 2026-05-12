import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || "digital-library";
const username = process.env.DB_USER || process.env.MYSQL_USER || "root";
const password = process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? "";
const host = process.env.DB_HOST || process.env.MYSQL_HOST || "localhost";
const port = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);

const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect: "mysql",
  logging: process.env.DB_LOGGING === "true" ? console.log : false,
});

export default sequelize;
