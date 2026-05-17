import { Sequelize } from "sequelize";

/**
 * Resolve MySQL connection settings from DATABASE_URL or discrete DB_* / MYSQL_* vars.
 */
export function resolveDbConfig() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, "") || "digital-library";
    return {
      database,
      username: decodeURIComponent(parsed.username || "root"),
      password: decodeURIComponent(parsed.password || ""),
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
    };
  }

  return {
    database:
      process.env.DB_NAME || process.env.MYSQL_DATABASE || "digital-library",
    username: process.env.DB_USER || process.env.MYSQL_USER || "root",
    password: process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? "",
    host: process.env.DB_HOST || process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
  };
}

export function createSequelize() {
  const { database, username, password, host, port } = resolveDbConfig();
  const dialectOptions =
    process.env.DB_SSL === "true"
      ? { ssl: { rejectUnauthorized: false } }
      : undefined;

  return new Sequelize(database, username, password, {
    host,
    port,
    dialect: "mysql",
    logging: process.env.DB_LOGGING === "true" ? console.log : false,
    ...(dialectOptions ? { dialectOptions } : {}),
  });
}
