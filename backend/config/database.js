import { Sequelize } from "sequelize";

const sequelize = new Sequelize("digital-library", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

export default sequelize;