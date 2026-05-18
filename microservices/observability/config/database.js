import { Sequelize } from "sequelize";

/**
 * Single MySQL connection entry point for all microservices.
 * Requires MYSQL_URL (e.g. mysql://user:pass@127.0.0.1:3306/digital-library).
 */
export function createSequelize() {
  const mysqlUrl = process.env.MYSQL_URL;
  if (!mysqlUrl || String(mysqlUrl).trim() === "") {
    throw new Error("MYSQL_URL must be set");
  }

  return new Sequelize(mysqlUrl, {
    dialect: "mysql",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
  });
}
