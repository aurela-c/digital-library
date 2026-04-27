import { Sequelize } from "sequelize";

const sequelize = new Sequelize("digital-library", "root", "", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});

export default sequelize;